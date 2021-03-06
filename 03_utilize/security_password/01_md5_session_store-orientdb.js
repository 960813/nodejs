const express = require('express');
const session = require('express-session');
const OrientoStore = require('connect-oriento')(session);
const db_config = require('../../secure-configure.json').db_config;
const md5 = require('md5');

const app = express();

app.use(session({
    store: new OrientoStore({
        server: 'host=' + db_config.host + '&port=2424&username=' + db_config.username + '&password=' + db_config.password + '&db=' + db_config.database
    }),
    secret: 'FluffyLlama',
    resave: false,
    saveUninitialized: true
}));
app.use(express.json()) // for parsing application/json
app.use(express.urlencoded({extended: true})) // for parsing application/x-www-form-urlencoded

app.get('/welcome', (req, res) => {
    if (req.session.displayName) {
        res.send(`
            <h1>Hello, ${req.session.displayName}</h1>
            <a href="/auth/logout">logout</a>
        `);
    } else
        res.send(`
            <h1>Welcome</h1>
            <a href="/auth/login">Login</a>
        `);
});

app.post('/auth/login', (req, res) => {
    const users = [
        {
            username: 'mr.keriel',
            password: '2d37c69116c91410baa06542c3084c89',
            salt: 'FluffyLlama_AW#@QEASDAS#Q@E$DSAFSDF',
            displayName: 'Mr.Keriel'
        },
        {
            username: 'st.keriel',
            password: 'a05b1fa00ed03761341074ac61f7aa03',
            salt: 'FluffyLlama_ASD@#$@#R#@$R#@TR#@',
            displayName: 'St.Keriel'
        }
    ]; 

    const uname = req.body.username;
    const pwd = req.body.password;

    for(let i=0;i<users.length;i++){
        let user = users[i];
        if (uname === user.username && md5(pwd+user.salt) === user.password) {
            req.session.displayName = user.displayName;
            return req.session.save(() => {
                res.redirect('/welcome');
            });
        }
    }
    res.send('Who are you? <a href="/auth/login">Login</a>');
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
    `;

    res.send(output);
});

app.get('/auth/logout', (req, res) => {
    delete req.session.displayName;
    req.session.save(() => {
        res.redirect('/Welcome');
    });
});

app.listen(3001, () => {
    console.log('3001 Port Connected!');
});