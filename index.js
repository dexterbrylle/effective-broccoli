'use strict';

require('dotenv').config();
require('events').EventEmitter.defaultMaxListeners = 15;
const path = require('path');
const express = require('express');
const morgan = require('morgan');
const helmet = require('helmet');
const monk = require('monk');
const yup = require('yup');
const { nanoid } = require('nanoid');
const slowDown = require('express-slow-down');
const rateLimit = require('express-rate-limit');

const db = monk(process.env.MONGO_URI);
const urls = db.get('urls');
urls.createIndex({ slug: 1 }, { unique: true });

const app = express();

app.enable('trust proxy');

app.use(helmet());
app.use(morgan('common'));
app.use(express.json());
app.use(express.static('./public'));

const notFoundPage = path.join(__dirname, 'public/404.html');

app.get('/:id', async (req, res, next) => {
  const { id: slug } = req.params;
  try {
    const url = await urls.findOne({ slug });
    if (url) {
      return res.redirect(url.url);
    }
    return res.status(404).sendFile(notFoundPage);
  } catch (error) {
    return res.status(404).sendFile(notFoundPage);
  }
});

const schema = yup.object().shape({
  slug: yup.string().trim().matches(/[\w-]+$/i),
  url: yup.string().trim().url().required()
});

app.post('/url', slowDown({
  windowMs: 15 * 60 * 1000,
  delayAfter: 5,
  delayMs: 100
}), rateLimit({
  windowMs: 15 * 60 * 100,
  max: 100
}), async (req, res, next) => {
  let { slug, url } = req.body;

  try {
    await schema.validate({
      slug,
      url
    });

    if (url.includes('brylle.xyz')) {
      throw new Error('Already parsed! 🙅🏻‍♂️');
    }

    if (!slug) {
      slug = nanoid(6);
    } else {
      const existing = await urls.findOne({ slug });
      if (existing) {
        throw new Error('Slug is already in use. 🐌');
      }
    }

    slug = slug.toLowerCase();

    const newUrl = {
      url,
      slug
    };
    const createUrl = await urls.insert(newUrl);
    return res.json(createUrl);
  } catch (error) {
    next(error);
  }
});

app.use((error, req, res, next) => {
  if (error.status) {
    res.status(error.status);
  } else {
    res.status(500);
  }

  res.json({
    message: error.message,
    stack: process.env.NODE_ENV === 'production' ? '⚡' : error.stack
  });
});

const port = process.env.PORT || 1337;
app.listen(port, () => {
  console.log(`Express listening on port: ${port}`);
});
