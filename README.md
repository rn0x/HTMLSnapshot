### HTMLSnapshot

HTMLSnapshot is a lightweight and efficient API for generating images from HTML templates using Node.js and Puppeteer. It allows you to convert dynamic HTML content into images, such as PNGs or JPEGs, with customizable Puppeteer options.

## Features

- HTML to Image Conversion: Generate images (PNG, JPEG, etc.) from HTML templates.
- Dynamic Data Injection: Seamlessly inject dynamic data into HTML templates.
- Headless Rendering: Utilizes Puppeteer for rendering HTML using a headless version of Chrome.
- Customizable Options: Modify Puppeteer settings for optimal performance and image quality.
- Rate Limiting: Implements rate limiting to prevent excessive requests from a single IP address.
- Error Handling: Provides structured error responses for better debugging and user experience.
- CORS Support: Allows cross-origin requests for integration with different client applications.

## Requirements

- Node.js (version 18 or higher)
- Docker (optional, but recommended)
- Google Chrome (if running Puppeteer manually)

## Installation

To get started with HTMLSnapshot, clone the repository and install the dependencies:

```bash
git clone https://github.com/rn0x/HTMLSnapshot.git
cd HTMLSnapshot
npm install
```

## Environment Variables

Create a `.env` file in the root of the project with the following variables:

```bash
NODE_ENV=development                             # The environment the server is running in (development or production)
PORT=3000                                        # Server port
PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome # Path to the executable for Chrome
PUPPETEER_HEADLESS=true                          # Can be set to true or false
PUPPETEER_TIMEOUT=10000                          # Timeout in milliseconds
IMAGE_QUALITY=100                                # Image quality (0 to 100)
IMAGE_TYPE=jpeg                                  # Image type (jpeg or png)
RATE_LIMIT_WINDOW_MS=3600000                     # 1 hour
RATE_LIMIT_MAX=500                               # Maximum requests per IP
BODY_SIZE_LIMIT=10mb                             # Maximum body size
```

## Usage

Once you've installed the dependencies, you can start the application:

```bash
npm start
```

The API will be available at `http://localhost:3000`.

### API Endpoint

#### POST `/generate-image`

Generate an image from an HTML template.

- **URL**: `/generate-image`
- **Method**: `POST`
- **Body**:
  ```json
  {
    "htmlTemplate": "<html><body>{{message}}</body></html>",
    "data": {
      "message": "Hello, World!"
    }
  }
  ```

- **Response**:

```json
{
  "success": true,
  "message": "Image generated successfully",
  "image": "<base64-encoded-image>"
}
```

### Examples

#### Using `curl`

You can send a POST request using `curl` as follows:

```bash
curl -X POST http://localhost:3000/generate-image \
-H "Content-Type: application/json" \
-d '{
  "htmlTemplate": "<html><body>{{message}}</body></html>",
  "data": {
    "message": "Hello, World!"
  }
}'
```

#### Using `fetch`

You can also use the `fetch` API in JavaScript to make the request:

```javascript
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
```

#### using `Telegraf.js`

```javascript
const Telegraf = require('telegraf');
const fetch = require('node-fetch');
const { Buffer } = require('buffer');

const bot = new Telegraf('YOUR_TELEGRAM_BOT_TOKEN');

bot.start((ctx) => ctx.reply('Hi! Send me anything to create an image of.'));

bot.on('text', async (ctx) => {
    const htmlTemplate = `<html><body>{{message}}</body></html>`;
    const data = { message: ctx.message.text };

    const response = await fetch('http://localhost:3000/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ htmlTemplate, data }),
    });

    const result = await response.json();

    if (result.success) {
        const imageBuffer = Buffer.from(result.image, 'base64');
        ctx.replyWithPhoto({ source: imageBuffer });
    } else {
        ctx.reply('An error occurred while creating the image.');
    }
});

bot.launch();
```

#### using `HTML`

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Convert HTML to Image</title>
</head>
<body>
    <h1>Create an Image from HTML</h1>
    <button id="generate-image">Generate Image</button>
    <script>
        document.getElementById('generate-image').addEventListener('click', async () => {
            const htmlTemplate = '<html><body><h1>{{message}}</h1></body></html>';
            const data = { message: 'Hello, World!' };

            const response = await fetch('http://localhost:3000/generate-image', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ htmlTemplate, data }),
            });

            const result = await response.json();

            if (result.success) {
                const img = document.createElement('img');
                img.src = 'data:image/png;base64,' + result.image;
                document.body.appendChild(img);
            } else {
                alert('An error occurred while generating the image.');
            }
        });
    </script>
</body>
</html>
```

## Docker Setup

You can easily run HTMLSnapshot in a Docker container. The provided `Dockerfile` ensures that Puppeteer and Google Chrome are properly installed for headless rendering.

### Build Docker Image

```bash
docker build -t htmlsnapshot .
```

### Run Docker Container

```bash
docker run -p 3000:3000 htmlsnapshot
```

Or use Docker Compose:

```bash
docker-compose up
```

## Rate Limiting

HTMLSnapshot uses a basic rate-limiting strategy to prevent abuse. The default rate limit is 500 requests per hour per IP address. You can adjust this limit in the source code as needed.

## Error Handling

The API provides consistent error responses in JSON format. Here's an example of an error response:

```json
{
  "success": false,
  "message": "htmlTemplate is required"
}
```

## Development

If you'd like to contribute to the project or run it in development mode:

1. Clone the repository.
2. Install dependencies:
    ```bash
    npm install
    ```
3. Start the development server:
    ```bash
    npm run dev
    ```

## License

This project is licensed under the MIT License. See the [LICENSE](./LICENSE) file for more details.

## Acknowledgements

- [Puppeteer](https://pptr.dev/) - A powerful library for interacting with browsers and achieving automation.
- [Express](https://expressjs.com/) - A Node.js framework that simplifies web application development.
- [dotenv](https://github.com/motdotla/dotenv) - For loading environment variables from a `.env` file.
- [Helmet](https://helmetjs.github.io/) - To secure Express applications from common vulnerabilities.
- [express-async-errors](https://github.com/delvedor/express-async-errors) - To catch unhandled errors in async functions.
- [express-rate-limit](https://github.com/nfriedly/express-rate-limit) - To limit the rate of requests to an API.
- [CORS](https://github.com/expressjs/cors) - To facilitate access to API resources from different origins.


---

Made with ❤️ by [rn0x](https://github.com/rn0x)