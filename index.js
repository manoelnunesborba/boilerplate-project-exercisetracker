/**
 * @file Exercisetracker API server
 * @description This file contains the implementation of an API server for an exercisetracker application.
 */

const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config();
const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost:27017/tracker', { useNewUrlParser: true, useUnifiedTopology: true });


const exerciceSchema = new mongoose.Schema({
  description: String,
  duration: Number,
  date: String
});
const Exercice = mongoose.model('Exercice', exerciceSchema);
const logSchema = new mongoose.Schema({
  username: String,
  count: Number,
  log: [exerciceSchema]
});

const Log = mongoose.model('Log', logSchema);

const userSchema = new mongoose.Schema({
  username: String,
});
const User = mongoose.model('User', userSchema);

app.use(cors());
app.use(express.static('public'));
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html');
});

/**
 * Saves a new user to the database.
 * @param {string} username - The username of the user.
 * @returns {Promise<User>} A promise that resolves to the newly created user.
 */
function saveUser(username) {
  const user = new User({
    username
  });
  return user.save();
}

app.use(express.urlencoded({ extended: false }));

app.post('/api/users', (req, res) => {
  const { username } = req.body;
  // Code to create a new user with the provided username
  User.findOne({ username }).then(existingUser => {
    
      saveUser(username).then(newUser => {
        res.json({ _id: newUser._id, username });
      }).catch(error => {
        res.status(400).json({ error: error.message });
      });
  }).catch(error => {
    res.status(400).json({ error: error.message });
  });
});

app.get('/api/users', (req, res) => {
  User.find({}).then(e => res.json(e));
});

app.post('/api/users/:_id/exercises', (req, res) => {
  const { _id } = req.params;
  const { description, duration, date } = req.body;

  // Code to create a new exercise entry for the user with the provided _id
  const exercise = new Exercice({
    description,
    duration,
    date: date || new Date().toDateString()
  });

  User.findById(_id).then(user => {
    if (!user) {
      res.status(404).json({ error: 'User not found' });
    } else {
      Log.findOne({ username: user.username }).then(log => {
        if (!log) {
          const newLog = new Log({
            username: user.username,
            count: 1,
            log: [exercise]
          });
          newLog.save().then(savedLog => {
            res.json({
              username: user.username,
              description: exercise.description,
              duration: exercise.duration,
              date: new Date(exercise.date).toDateString(),
              _id: user._id
            });
          }).catch(error => {
            res.status(400).json({ error: error.message });
          });
        } else {
          log.count += 1;
          log.duration += exercise.duration;
          log.log.push(exercise);
          log.save().then(savedLog => {
            res.json({
              username: user.username,
              description: exercise.description,
              duration: exercise.duration,
              date: new Date(exercise.date).toDateString(),
              _id: user._id
            });
          }).catch(error => {
            res.status(400).json({ error: error.message });
          });
        }
      }).catch(error => {
        res.status(400).json({ error: error.message });
      });
    }
  }).catch(error => {
    res.status(400).json({ error: error.message });
  });
});
app.get('/api/users/:_id/logs', (req, res) => {
  const { _id } = req.params;
  const { from, to, limit } = req.query;
  
  User.findById(_id).then(user => {
    if (!user) {
      res.status(404).json({ error: 'User not found' });
    } else {
      Log.findOne({ username: user.username }).then(log => {
        if (!log) {
          res.status(404).json({ error: 'User not found' });
        } else {
          let filteredLog = log.log;
          
          if (from) {
            filteredLog = filteredLog.filter(exercise => new Date(exercise.date) >= new Date(from));
          }
          
          if (to) {
            filteredLog = filteredLog.filter(exercise => new Date(exercise.date) <= new Date(to));
          }
          
          if (limit) {
            filteredLog = filteredLog.slice(0, limit);
          }
          
          res.json({
            _id: user._id,
            username: user.username,
            count: filteredLog.length,
            log: filteredLog
          });
        }
      }).catch(error => {
        res.status(400).json({ error: error.message });
      });
    }
  }).catch(error => {
    res.status(400).json({ error: error.message });
  });
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port);
});
