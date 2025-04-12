'use strict';

const Thread = require('../models/Thread');

module.exports = function (app) {
  // Threads Routes: /api/threads/:board
  app.route('/api/threads/:board')
    // POST: Create a new thread
    .post(async (req, res) => {
      const { text, delete_password } = req.body;
      const board = req.params.board;

      if (!text || !delete_password) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      const thread = new Thread({
        board,
        text,
        delete_password,
        created_on: new Date(),
        bumped_on: new Date(),
        reported: false,
        replies: []
      });

      try {
        const savedThread = await thread.save();
        res.json(savedThread);
      } catch (err) {
        res.status(500).json({ error: 'Could not create thread' });
      }
    })

    // GET: Get the 10 most recent threads with up to 3 replies each
    .get(async (req, res) => {
      const board = req.params.board;

      try {
        const threads = await Thread.find({ board })
          .sort({ bumped_on: -1 }) // Sort by most recent
          .limit(10) // Limit to 10 threads
          .select('-delete_password') // Exclude sensitive fields
          .lean();

        // For each thread, limit replies to 3 and exclude sensitive fields
        threads.forEach(thread => {
          thread.replies = thread.replies
            .sort((a, b) => b.created_on - a.created_on) // Sort replies by most recent
            .slice(0, 3) // Limit to 3 replies
            .map(reply => {
              delete reply.delete_password; // Remove sensitive field
              return reply;
            });
        });

        res.json(threads);
      } catch (err) {
        res.status(500).json({ error: 'Could not fetch threads' });
      }
    })

    // DELETE: Delete a thread with the correct password
    .delete(async (req, res) => {
      const { thread_id, delete_password } = req.body;

      if (!thread_id || !delete_password) {
        return res.status(400).send('Missing required fields');
      }

      try {
        const thread = await Thread.findById(thread_id);
        if (!thread) {
          return res.status(404).send('Thread not found');
        }

        if (thread.delete_password !== delete_password) {
          return res.status(400).send('incorrect password');
        }

        await Thread.deleteOne({ _id: thread_id });
        res.send('success');
      } catch (err) {
        res.status(500).send('Could not delete thread');
      }
    })

    // PUT: Report a thread
    .put(async (req, res) => {
      const { thread_id } = req.body;

      if (!thread_id) {
        return res.status(400).send('Missing thread_id');
      }

      try {
        const thread = await Thread.findById(thread_id);
        if (!thread) {
          return res.status(404).send('Thread not found');
        }

        thread.reported = true;
        await thread.save();
        res.send('reported');
      } catch (err) {
        res.status(500).send('Could not report thread');
      }
    });

  // Replies Routes: /api/replies/:board
  app.route('/api/replies/:board')
    // POST: Add a reply to a thread
    .post(async (req, res) => {
      const { thread_id, text, delete_password } = req.body;

      if (!thread_id || !text || !delete_password) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      try {
        const thread = await Thread.findById(thread_id);
        if (!thread) {
          return res.status(404).json({ error: 'Thread not found' });
        }

        const reply = {
          text,
          delete_password,
          created_on: new Date(),
          reported: false
        };

        thread.replies.push(reply);
        thread.bumped_on = new Date(); // Update bumped_on when a reply is added
        await thread.save();
        res.json(thread);
      } catch (err) {
        res.status(500).json({ error: 'Could not add reply' });
      }
    })

    // GET: Get a thread with all its replies
    .get(async (req, res) => {
      const { thread_id } = req.query;

      if (!thread_id) {
        return res.status(400).json({ error: 'Missing thread_id' });
      }

      try {
        const thread = await Thread.findById(thread_id)
          .select('-delete_password') // Exclude sensitive fields
          .lean();

        if (!thread) {
          return res.status(404).json({ error: 'Thread not found' });
        }

        // Exclude delete_password from replies
        thread.replies = thread.replies.map(reply => {
          delete reply.delete_password;
          return reply;
        });

        res.json(thread);
      } catch (err) {
        res.status(500).json({ error: 'Could not fetch thread' });
      }
    })

    // DELETE: Delete a reply with the correct password
    .delete(async (req, res) => {
      const { thread_id, reply_id, delete_password } = req.body;

      if (!thread_id || !reply_id || !delete_password) {
        return res.status(400).send('Missing required fields');
      }

      try {
        const thread = await Thread.findById(thread_id);
        if (!thread) {
          return res.status(404).send('Thread not found');
        }

        const reply = thread.replies.id(reply_id);
        if (!reply) {
          return res.status(404).send('Reply not found');
        }

        if (reply.delete_password !== delete_password) {
          return res.status(400).send('incorrect password');
        }

        thread.replies.pull(reply_id);
        await thread.save();
        res.send('success');
      } catch (err) {
        res.status(500).send('Could not delete reply');
      }
    })

    // PUT: Report a reply
    .put(async (req, res) => {
      const { thread_id, reply_id } = req.body;

      if (!thread_id || !reply_id) {
        return res.status(400).send('Missing required fields');
      }

      try {
        const thread = await Thread.findById(thread_id);
        if (!thread) {
          return res.status(404).send('Thread not found');
        }

        const reply = thread.replies.id(reply_id);
        if (!reply) {
          return res.status(404).send('Reply not found');
        }

        reply.reported = true;
        await thread.save();
        res.send('reported');
      } catch (err) {
        res.status(500).send('Could not report reply');
      }
    });
};