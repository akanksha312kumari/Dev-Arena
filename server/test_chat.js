const axios = require('axios');
(async () => {
  try {
    const res = await axios.post('http://localhost:5000/api/ai/chat', {
      messages: [{ role: 'user', content: 'hello' }]
    }, {
      headers: {
        // Need to simulate auth, or bypass auth?
        // Wait, the route is protected by `protect` middleware.
        // I need a valid token.
      }
    });
    console.log(res.data);
  } catch (err) {
    console.error(err.response ? err.response.data : err.message);
  }
})();
