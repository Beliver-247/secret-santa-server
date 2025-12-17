import express, { Application } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import config from './config';
import { connectDB } from './config/database';
import passport from './config/passport';
import routes from './routes';
import { errorHandler } from './middleware/errorHandler';

const app: Application = express();

// Connect to database
connectDB();

// Middleware
app.use(
  cors({
    origin: config.clientUrl,
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Passport initialization
app.use(passport.initialize());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api', routes);

// Error handler (must be last)
app.use(errorHandler);

// Start server
const PORT = config.port;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📱 Environment: ${config.nodeEnv}`);
  console.log(`🌐 Client URL: ${config.clientUrl}`);
});

export default app;
