const express = require('express');
const session = require('express-session');
const FileStore = require('session-file-store')(session);
const bkfd2Password = require("pbkdf2-password");
const passport = require('passport')
const LocalStrategy = require('passport-local').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const hasher = bkfd2Password();

const fs = require('fs');
const https = require('https');

// key define
const optionsForHTTPS = {
    key: fs.readFileSync('/etc/letsencrypt/live/jupiterflow.com/privkey.pem'),
    cert: fs.readFileSync('/etc/letsencrypt/live/jupiterflow.com/cert.pem')
};

const app = express();
app.use(express.json()) // for parsing application/json
app.use(express.urlencoded({extended: true})) // for parsing application/x-www-form-urlencoded

app.use(session({
    secret: '1234DSFs@adf1234!@#$asd',
    resave: false,
    saveUninitialized: true,
    store: new FileStore()
}));

app.use(passport.initialize(undefined));
app.use(passport.session(undefined));

app.get('/count', (req, res) => {
    if (req.session.count) {
        req.session.count++;
    } else {
        req.session.count = 1;
    }
    res.send('count : ' + req.session.count);
});
app.get('/auth/logout', (req, res) => {
    req.logout();
    req.session.save(() => {
        res.redirect('/welcome');
    });
});
app.get('/welcome', (req, res) => {
    if (req.user && req.user.displayName) {
        res.send(`
      <h1>Hello, ${req.user.displayName}</h1>
      <h3>email: ${req.user.email}</h3>
      <a href="/auth/logout">logout</a>
    `);
    } else {
        res.send(`
      <h1>Welcome</h1>
      <ul>
        <li><a href="/auth/login">Login</a></li>
        <li><a href="/auth/register">Register</a></li>
      </ul>
    `);
    }
});

passport.serializeUser((user, done) => {
    console.log('serializeUser', user);
    done(null, user.authId);
});

passport.deserializeUser((id, done) => {
    console.log('deserializeUser', id);
    for (let i = 0; i < users.length; i++) {
        const user = users[i];
        if (id === user.authId) {
            return done(null, user);
            // req.user 객체 생성
        }
    }
    done('There is no user');
});

passport.use(new LocalStrategy({
        usernameField: 'username',
        passwordField: 'password'
    },
    (username, password, done) => {
        const uname = username;
        const pwd = password;
        for (let i = 0; i < users.length; i++) {
            const user = users[i];
            if (uname === user.username) {
                return hasher({password: pwd, salt: user.salt}, (err, pass, salt, hash) => {
                    console.log('LocalStrategy', user);
                    if (hash === user.password) {
                        done(null, user);
                    } else {
                        done(null, false);
                    }
                });
            }
        }
        done(null, false);
    }
));
const secureConfigure = require('./secure-configure.json');
passport.use(new FacebookStrategy({
        clientID: secureConfigure.clientID,
        clientSecret: secureConfigure.clientSecret,
        callbackURL: "/auth/facebook/callback",
        profileFields: ['id', 'email', 'gender', 'link', 'locale', 'name', 'timezone', 'updated_time', 'verified', 'displayName']
    },
    (accessToken, refreshToken, profile, done) => {
        console.log(profile);
        const authId = 'facebook:' + profile.id;
        for (let i = 0; i < users.length; i++) {
            const user = users[i];
            if (user.authId === authId) {
                return done(null, user);
            }
        }
        const newUser = {
            'authId': authId,
            'displayName': profile.displayName,
            'email': profile.emails[0].value
        };
        users.push(newUser);
        done(null, newUser);
    }
));

app.post('/auth/login',
    passport.authenticate(
        'local',
        {
            successRedirect: '/welcome',
            failureRedirect: '/auth/login',
            failureFlash: false
        }
    ),
    (req, res) => {
        req.session.save(() => {
            res.redirect('/welcome');
        });
    }
);
app.get('/auth/facebook',
    passport.authenticate(
        'facebook',
        {
            scope: ['email']
        }
    )
);

app.get('/auth/facebook/callback',
    passport.authenticate(
        'facebook',
        {
            failureRedirect: '/auth/login'
        }
    ), (req, res) => {
        req.session.save(() => {
            res.redirect('/welcome');
        });
    }
);
const users = [
    {
        authId: 'local:keriel',
        username: 'keriel',
        password: '9f8c0nrB9o0ADdwWZYFIhTt/rhgyF0TlQh0KqRc4kP3Uo5nYwH95dr30+Yt82qt8FcVsl20c9zTp40mNSfgn+VENxtfStIcj4WCCrigZp3WeCDR00k7q55Ij1P1/0ZTwk1p8M7sffkeMv6IbbhXwuF0DmeG8Uf3Gh8qZeZ3V174=',
        salt: '8WLL0DbvqJTk3d6f38lLs35wZACQ5pd2V3Lc/Gc9QRbfIV5VRpwwuqWhBLByIdT10EBy/Rx9wsFQvQ0VH6KzVw==',
        displayName: 'Mr.Keriel'
    }
];
app.post('/auth/register', (req, res) => {
    hasher({password: req.body.password}, (err, pass, salt, hash) => {
        const user = {
            authId: 'local:' + req.body.username,
            username: req.body.username,
            password: hash,
            salt: salt,
            displayName: req.body.displayName
        };
        users.push(user);
        req.login(user, (err) => {
            req.session.save(() => {
                res.redirect('/welcome');
            });
        });
    });
});
app.get('/auth/register', (req, res) => {
    const output = `
  <h1>Register</h1>
  <form action="/auth/register" method="post">
    <p>
      <input type="text" name="username" placeholder="username">
    </p>
    <p>
      <input type="password" name="password" placeholder="password">
    </p>
    <p>
      <input type="text" name="displayName" placeholder="displayName">
    </p>
    <p>
      <input type="submit">
    </p>
  </form>
  `;
    res.send(output);
});
app.get('/auth/login', (req, res) => {
    const output = `
  <h1>Login</h1>
  <form action="/auth/login" method="post">
    <p>
      <input type="text" name="username" placeholder="username">
    </p>
    <p>
      <input type="password" name="password" placeholder="password">
    </p>
    <p>
      <input type="submit">
    </p>
  </form>
  <a href="/auth/facebook">facebook</a>
  `;
    res.send(output);
});

https.createServer(optionsForHTTPS, app).listen(3001);
// app.listen(3001, () => {
//     console.log('Connected 3001 port!!!');
// });