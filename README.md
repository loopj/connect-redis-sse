Connect.js Server-Sent Events with Redis
========================================

Connect/Express middleware for publishing Server-Sent Events (EventSource)
using Redis pub/sub.


Usage
-----
```javascript
// Attach the middleware
connectRedisSse = require("connect-redis-sse");
app.use(connectRedisSse({redis: yourRedisClient}));

// Set up a subscription to a channel in your route
app.get("/subscribe-me", function (req, res) {
  res.subscribe("channelName");
});
```