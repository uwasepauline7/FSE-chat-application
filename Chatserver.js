var express = require('express');
var bodyParser = require('body-parser')
var app = express();
var path = require('path');
var http = require('http').createServer(app);
var { Server} = require('socket.io');
var io = new Server(http, {/* You can put your options here */});
var mongoose = require('mongoose');
const User = require('./models/users');
const bcrypt = require('bcrypt');
var jwt = require('jsonwebtoken');
//var socket = io.connect('http://localhost:3000');

const cors= require('cors')


//allow cors
app.use(cors());

app.use('/socket.io', express.static(path.join(__dirname, 'node_modules', 'socket.io', 'client-dist')));
app.use(express.static(__dirname))
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}))

var Message = mongoose.model('Message',{
  name : String,
  message : String
})

//connecting to the Database

var dbUrl = 'mongodb+srv://chatapplication:chatapplication1@cluster0.kqpjwpd.mongodb.net/messages'


app.get('/messages', (req, res) => {
    Message.find({})
      .then(messages => {
        //res.send(messages);
        res.sendFile(__dirname.slice(0, __dirname.length) + '/chat_UI.html');
      })
      .catch(err => {
        console.error(err);
        res.sendStatus(500);
      });
  });


  app.get('/', (req, res) => {
    res.sendFile(__dirname.slice(0, __dirname.length) + '/hello.html');
  });

  // Registration route
app.post('/register', async (req, res) => {
    const { username, password } = req.body;

    // Validate input
    if (!username || !password) {
        return res.status(400).send('Username and password are required.');
    }

    // For testing purposes, log the received data
    console.log('Received registration data:', { username, password });

 // Validate input
 if (!username || !password) {
    return res.status(400).send('Username and password are required.');
  }

  // Hash the password
  const hashedPassword = await bcrypt.hash(password, 10);

  // Saving user to the database
  try {
    const user = new User({ username, password: hashedPassword });
    await user.save();
    res.send('Registration successful.');
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});
// Login routing
app.post('/login', async (req, res) => {
    const { username, password } = req.body;
  
    // Validate input
    if (!username || !password) {
      return res.status(400).send('Username and password are required.');
    }
  
    // Finding user in the database
    const user = await User.findOne({ username });
  
    // Check if user exists and compare passwords using jwt
    if (user && (await bcrypt.compare(password, user.password))) {
        const token = jwt.sign({ foo: user._id }, 'shhhhh');
        res.cookie('jwt', jwt);
        res.cookie('username', user.username);
        res.status(200).send(user.username);
    } else {
        res.status(401).send('Invalid username or password.');
    }
  });
  
app.get('/messages/:user', (req, res) => {
  var user = req.params.user
  Message.find({name: user},(err, messages)=> {
    res.send(messages);
  })
})


app.post('/messages', async (req, res) => {
  try{
    var message = new Message(req.body);

    var savedMessage = await message.save()
      console.log('saved');

    var censored = await Message.findOne({message:'badword'});
      if(censored)
        await Message.remove({_id: censored.id})
      else
        io.emit('message', req.body);
      res.sendStatus(200);
  }
  catch (error){
    res.sendStatus(500);
    return console.log('error',error);
  }
  finally{
    console.log('Message Posted')
  }

})



io.on('connection', (socket) =>{
  console.log('a user is connected')

    socket.join("fse");

    socket.on('message', msg => {
        console.log("The user send: ", msg);
        io.to("fse").emit('broadcast', msg);
    });
     // Handle logout event
    socket.on('logout', () => {
        console.log('User logged out');
        socket.emit('logout_message', 'You have been logged out.'); 
        socket.disconnect(); // Disconnect the socket connection for the user
    });
})

mongoose.connect(dbUrl, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('MongoDB connection error:', err));


var server = http.listen(3000, () => {
  console.log('server is running on port', server.address().port);
});
