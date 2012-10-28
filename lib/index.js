//
// Simple pub/sub using redis and server-sent events (EventSource)
//
// Usage:
//
//   // Attach the middleware
//   redisSse = require("redis-sse");
//   app.use(redisSse({redis: yourRedisClient}));
//
//   // Set up a subscription to a channel in your route
//   app.get("/subscribe-me", function (req, res) {
//     res.subscribe("channelName");
//   });
//
// That's it! Anything you publish to the redis channel "channelName" will
// be delivered as a server-sent event to the client.
//
// TODO: Add support for id and event fields in message?
//

exports = module.exports = function(opts) {
  if(!opts.redis) {
    throw new Error("You must specify a redis client when using redisSse middleware.");
  }

  return function(req, res, next) {
    res.subscribe = function(channel) {
      var heartbeatTimeout = null;
      var sendHeartbeat = function () {
        clearHeartbeat();
        res.write(": hb\n\n");
        startHeartbeat();
      };

      var startHeartbeat = function () {
        heartbeatTimeout = setTimeout(sendHeartbeat, 15000);
      };

      var clearHeartbeat = function () {
        clearTimeout(heartbeatTimeout);
        heartbeatTimeout = null;
      };

      var sendMessage = function (message) {
        clearHeartbeat();

        // Handle newlines in message
        var data = "";
        if(message) {
          data += "data: " + message.split(/\n/).join("\ndata:") + "\n";
        }
        data += "\n"; // final part of message

        // Send this event to the client
        res.write(data);

        startHeartbeat();
      };

      var messageReceived = function(c, message) {
        if (c === channel) {
          sendMessage(message);
        }
      };

      // Return 404 unless this is an event-stream request
      if(req.headers.accept != "text/event-stream") {
        res.send(404);
        return;
      }

      // Send the response headers
      res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive"
      });

      // Support ajax sse polyfills
      if(req.headers["X-Requested-With"] == "XMLHttpRequest") {
        res.xhr = null;
      }

      // Subscribe to redis pub/sub channel
      opts.redis.subscribe(channel);
      opts.redis.addListener("message", messageReceived);
      startHeartbeat();

      // Unsubscribe from redis pub/sub channel when connection is closed
      req.once("close", function () {
        clearHeartbeat();
        opts.redis.unsubscribe(channel);
        opts.redis.removeListener("message", messageReceived);
      });
    };
    
    next();
  };
};