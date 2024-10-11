import fetch from 'node-fetch'

fetch('http://localhost:3000/generate-image', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      htmlTemplate: '<html><body>{{message}}</body></html>',
      data: {
        message: 'Hello, World!'
      }
    })
  })
  .then(response => response.json())
  .then(data => {
    console.log('Success:', data);
  })
  .catch((error) => {
    console.error('Error:', error);
  });