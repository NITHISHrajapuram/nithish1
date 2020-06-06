//jshint esversion:6
require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const session = require("express-session");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require("mongoose-findorcreate");


const app = express();
app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({extended: true}));
app.use(session({
  secret:"i am loving",
  resave:false,
  saveUnintialized:false
}));
app.use(passport.initialize());
app.use(passport.session());


mongoose.connect("mongodb://localhost:27017/userDB",{ useNewUrlParser:true});
mongoose.set("useCreateIndex",true);


const userSchema = new mongoose.Schema({
  email:String,
  password:String,
  googleId:String,
  secret:String
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);
const User = mongoose.model("User",userSchema);

passport.use(User.createStrategy());
passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});
passport.use(new GoogleStrategy({
    clientID: process.env.CREATE_ID,
    clientSecret: process.env.CREATE_SECRET,
    callbackURL: "http://localhost:3000/auth/google/security",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"

  },
  function(accessToken, refreshToken, profile, cb) {
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
            return cb(err, user);
    });
  }
));

app.get("/",function(req,res){
  res.render("home");
});
app.get("/auth/google",
  passport.authenticate('google', { scope: ['profile'] }
));
app.get("/auth/google/security",
passport.authenticate('google', { failureRedirect: '/login' }),
function(req, res) {
  // Successful authentication, redirect home.
  res.redirect('/');
});



app.get("/login",function(req,res){
  res.render("login");
});

app.get("/register",function(req,res){
  res.render("register");
});
app.get("/secrets",function(req,res){
  User.find({"secret":{$ne: null }},function(err,foundUserss){
    if(err){
      console.log(err);
    }
    else{
      if(foundUserss){
        res.render("secrets",{usersWithSecrets:foundUserss});
      }
    }
  });

});
app.get("/submit",function(req,res){
  if(req.isAuthenticated()){
    res.render("submit");
  }
  else{
    res.redirect("/login");
  }



});
app.post("/submit",function(req,res){
  const submittedSecret=req.body.secret;
  console.log(req.user.id);
 User.findById(req.user.id,function(err,foundUser){
    if(err){
      console.log(err);
    }
    else{
    if(foundUser){
      foundUser.secret=submittedSecret;
       foundUser.save(function(){
         res.redirect("/secrets");
       });
      }
    }
  });

});

app.get("/logout",function(req,res){
  req.logout();
  res.redirect("/");
});

app.post("/register",function(req,res){
  User.register({username:req.body.username},req.body.password,function(err,user){
    if(err){
      console.log(err);
      res.redirect("/register");
    }
    else{
      passport.authenticate("local")(req,res,function(){
        res.redirect("/login");
      });
    }
  });

});


 app.post("/login",function(req,res){
   const user = new User({
     username:req.body.username,
     password:req.body.password
   });
   req.login(user,function(err){
     if(err){
       console.log(err);
     }
     else{
       passport.authenticate("local")(req,res,function(){
         res.redirect("/secrets");
       });
     }
   });
 });
 let port = process.env.PORT;
if (port == null || port == "") {
  port = 3000;
}
app.listen(port);


 app.listen(3000, function() {
  console.log("Server started on port 3000");
});
