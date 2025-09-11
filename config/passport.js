const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Local strategy
passport.use(new LocalStrategy(
  { usernameField: 'email' },
  async (email, password, done) => {
    try {
      const user = await prisma.user.findUnique({
        where: { email: email }
      });

      if (!user) {
        console.error("No user with that email")
        return done(null, false, { message: "No user with that email"});
      }

      const isMatch = await bcrypt.compare(password, user.password);
      
      if (isMatch) {
        return done(null, user);
      } else {
        console.error("Password incorrect")
        return done(null, false, { message: 'Password incorrect' });
      }
    } catch (error) {
      console.error(error)
      return done(error);
    }
  }
));

// Serialize user
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// Deserialize user
passport.deserializeUser(async (id, done) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: id }
    });
    done(null, user);
  } catch (error) {
    done(error);
  }
});

module.exports = passport;