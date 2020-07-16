const app = new Vue({
  el: '#app',
  data: {
    url: '',
    slug: '',
    error: '',
    formVisible: true,
    created: null
  },
  methods: {
    async createUrl () {
      this.error = '';

      const response = await fetch('/url', {
        method: 'POST',
        headers: {
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          url: this.url,
          slug: this.slug || undefined
        })
      });

      if (response.ok) {
        const result = await response.json();
        this.formVisible = false;
        this.created = `http://www.brylle.xyz/${result.slug}`;
      } else {
        const result = await response.json();
        this.error = result.message;
      }
    }
  }
});
