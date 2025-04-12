const chaiHttp = require('chai-http');
const chai = require('chai');
const assert = chai.assert;
const server = require('../server');

chai.use(chaiHttp);

suite('Functional Tests', function() {
  // Test suite for threads
  suite('Thread Tests', function() {
    // Test 1: Creating a new thread - POST /api/threads/{board}
    test('Creating a new thread: POST request to /api/threads/{board}', function(done) {
      chai.request(server)
        .post('/api/threads/test')
        .send({
          text: 'Test thread',
          delete_password: 'password123'
        })
        .end(function(err, res) {
          assert.equal(res.status, 200);
          assert.isObject(res.body, 'Response should be an object');
          assert.property(res.body, '_id', 'Thread should have an _id');
          assert.equal(res.body.text, 'Test thread', 'Thread text should match');
          assert.equal(res.body.delete_password, 'password123', 'Delete password should match');
          assert.property(res.body, 'created_on', 'Thread should have a created_on date');
          assert.property(res.body, 'bumped_on', 'Thread should have a bumped_on date');
          assert.equal(res.body.reported, false, 'Thread should not be reported by default');
          assert.isArray(res.body.replies, 'Replies should be an array');
          assert.equal(res.body.replies.length, 0, 'New thread should have no replies');
          done();
        });
    });

    // Test 2: Viewing the 10 most recent threads with 3 replies each - GET /api/threads/{board}
    test('Viewing the 10 most recent threads with 3 replies each: GET request to /api/threads/{board}', function(done) {
      chai.request(server)
        .get('/api/threads/test')
        .end(function(err, res) {
          assert.equal(res.status, 200);
          assert.isArray(res.body, 'Response should be an array');
          assert.isAtMost(res.body.length, 10, 'Should return at most 10 threads');
          res.body.forEach(thread => {
            assert.property(thread, '_id', 'Thread should have an _id');
            assert.property(thread, 'text', 'Thread should have text');
            assert.property(thread, 'created_on', 'Thread should have created_on');
            assert.property(thread, 'bumped_on', 'Thread should have bumped_on');
            assert.notProperty(thread, 'delete_password', 'Delete password should not be returned');
            assert.isArray(thread.replies, 'Replies should be an array');
            assert.isAtMost(thread.replies.length, 3, 'Each thread should have at most 3 replies');
            thread.replies.forEach(reply => {
              assert.notProperty(reply, 'delete_password', 'Reply delete_password should not be returned');
            });
          });
          done();
        });
    });

    // Test 3: Deleting a thread with the incorrect password - DELETE /api/threads/{board}
    test('Deleting a thread with the incorrect password: DELETE request to /api/threads/{board}', function(done) {
      // First, create a thread to delete
      chai.request(server)
        .post('/api/threads/test')
        .send({
          text: 'Thread to delete',
          delete_password: 'correctpassword'
        })
        .end(function(err, res) {
          const threadId = res.body._id;
          // Now attempt to delete with the wrong password
          chai.request(server)
            .delete('/api/threads/test')
            .send({
              thread_id: threadId,
              delete_password: 'wrongpassword'
            })
            .end(function(err, res) {
              assert.equal(res.status, 400);
              assert.equal(res.text, 'incorrect password', 'Should return "incorrect password"');
              done();
            });
        });
    });

    // Test 4: Deleting a thread with the correct password - DELETE /api/threads/{board}
    test('Deleting a thread with the correct password: DELETE request to /api/threads/{board}', function(done) {
      // First, create a thread to delete
      chai.request(server)
        .post('/api/threads/test')
        .send({
          text: 'Thread to delete',
          delete_password: 'correctpassword'
        })
        .end(function(err, res) {
          const threadId = res.body._id;
          // Now delete with the correct password
          chai.request(server)
            .delete('/api/threads/test')
            .send({
              thread_id: threadId,
              delete_password: 'correctpassword'
            })
            .end(function(err, res) {
              assert.equal(res.status, 200);
              assert.equal(res.text, 'success', 'Should return "success"');
              done();
            });
        });
    });

    // Test 5: Reporting a thread - PUT /api/threads/{board}
    test('Reporting a thread: PUT request to /api/threads/{board}', function(done) {
      // First, create a thread to report
      chai.request(server)
        .post('/api/threads/test')
        .send({
          text: 'Thread to report',
          delete_password: 'password123'
        })
        .end(function(err, res) {
          const threadId = res.body._id;
          // Now report the thread
          chai.request(server)
            .put('/api/threads/test')
            .send({
              thread_id: threadId
            })
            .end(function(err, res) {
              assert.equal(res.status, 200);
              assert.equal(res.text, 'reported', 'Should return "reported"');
              done();
            });
        });
    });
  });

  // Test suite for replies
  suite('Reply Tests', function() {
    // Test 6: Creating a new reply - POST /api/replies/{board}
    test('Creating a new reply: POST request to /api/replies/{board}', function(done) {
      // First, create a thread to reply to
      chai.request(server)
        .post('/api/threads/test')
        .send({
          text: 'Thread for reply',
          delete_password: 'password123'
        })
        .end(function(err, res) {
          const threadId = res.body._id;
          // Now post a reply
          chai.request(server)
            .post('/api/replies/test')
            .send({
              thread_id: threadId,
              text: 'Test reply',
              delete_password: 'replypassword'
            })
            .end(function(err, res) {
              assert.equal(res.status, 200);
              assert.isObject(res.body, 'Response should be an object');
              assert.property(res.body, 'replies', 'Thread should have replies');
              assert.equal(res.body.replies.length, 1, 'Thread should have 1 reply');
              assert.equal(res.body.replies[0].text, 'Test reply', 'Reply text should match');
              assert.equal(res.body.replies[0].delete_password, 'replypassword', 'Reply delete password should match');
              done();
            });
        });
    });

    // Test 7: Viewing a single thread with all replies - GET /api/replies/{board}
    test('Viewing a single thread with all replies: GET request to /api/replies/{board}', function(done) {
      // First, create a thread and add a reply
      chai.request(server)
        .post('/api/threads/test')
        .send({
          text: 'Thread with replies',
          delete_password: 'password123'
        })
        .end(function(err, res) {
          const threadId = res.body._id;
          chai.request(server)
            .post('/api/replies/test')
            .send({
              thread_id: threadId,
              text: 'Test reply',
              delete_password: 'replypassword'
            })
            .end(function(err, res) {
              // Now get the thread with all replies
              chai.request(server)
                .get('/api/replies/test')
                .query({ thread_id: threadId })
                .end(function(err, res) {
                  assert.equal(res.status, 200);
                  assert.isObject(res.body, 'Response should be an object');
                  assert.property(res.body, '_id', 'Thread should have an _id');
                  assert.property(res.body, 'text', 'Thread should have text');
                  assert.notProperty(res.body, 'delete_password', 'Delete password should not be returned');
                  assert.isArray(res.body.replies, 'Replies should be an array');
                  assert.equal(res.body.replies.length, 1, 'Thread should have 1 reply');
                  assert.equal(res.body.replies[0].text, 'Test reply', 'Reply text should match');
                  assert.notProperty(res.body.replies[0], 'delete_password', 'Reply delete_password should not be returned');
                  done();
                });
            });
        });
    });

    // Test 8: Deleting a reply with the incorrect password - DELETE /api/replies/{board}
    test('Deleting a reply with the incorrect password: DELETE request to /api/replies/{board}', function(done) {
      // First, create a thread and add a reply
      chai.request(server)
        .post('/api/threads/test')
        .send({
          text: 'Thread for reply deletion',
          delete_password: 'password123'
        })
        .end(function(err, res) {
          const threadId = res.body._id;
          chai.request(server)
            .post('/api/replies/test')
            .send({
              thread_id: threadId,
              text: 'Reply to delete',
              delete_password: 'correctreplypassword'
            })
            .end(function(err, res) {
              const replyId = res.body.replies[0]._id;
              // Now attempt to delete the reply with the wrong password
              chai.request(server)
                .delete('/api/replies/test')
                .send({
                  thread_id: threadId,
                  reply_id: replyId,
                  delete_password: 'wrongpassword'
                })
                .end(function(err, res) {
                  assert.equal(res.status, 400);
                  assert.equal(res.text, 'incorrect password', 'Should return "incorrect password"');
                  done();
                });
            });
        });
    });

    // Test 9: Deleting a reply with the correct password - DELETE /api/replies/{board}
    test('Deleting a reply with the correct password: DELETE request to /api/replies/{board}', function(done) {
      // First, create a thread and add a reply
      chai.request(server)
        .post('/api/threads/test')
        .send({
          text: 'Thread for reply deletion',
          delete_password: 'password123'
        })
        .end(function(err, res) {
          const threadId = res.body._id;
          chai.request(server)
            .post('/api/replies/test')
            .send({
              thread_id: threadId,
              text: 'Reply to delete',
              delete_password: 'correctreplypassword'
            })
            .end(function(err, res) {
              const replyId = res.body.replies[0]._id;
              // Now delete the reply with the correct password
              chai.request(server)
                .delete('/api/replies/test')
                .send({
                  thread_id: threadId,
                  reply_id: replyId,
                  delete_password: 'correctreplypassword'
                })
                .end(function(err, res) {
                  assert.equal(res.status, 200);
                  assert.equal(res.text, 'success', 'Should return "success"');
                  done();
                });
            });
        });
    });

    // Test 10: Reporting a reply - PUT /api/replies/{board}
    test('Reporting a reply: PUT request to /api/replies/{board}', function(done) {
      // First, create a thread and add a reply
      chai.request(server)
        .post('/api/threads/test')
        .send({
          text: 'Thread for reply reporting',
          delete_password: 'password123'
        })
        .end(function(err, res) {
          const threadId = res.body._id;
          chai.request(server)
            .post('/api/replies/test')
            .send({
              thread_id: threadId,
              text: 'Reply to report',
              delete_password: 'replypassword'
            })
            .end(function(err, res) {
              const replyId = res.body.replies[0]._id;
              // Now report the reply
              chai.request(server)
                .put('/api/replies/test')
                .send({
                  thread_id: threadId,
                  reply_id: replyId
                })
                .end(function(err, res) {
                  assert.equal(res.status, 200);
                  assert.equal(res.text, 'reported', 'Should return "reported"');
                  done();
                });
            });
        });
    });
  });
});