module.exports = {
  testEnvironment: 'node',
  coveragePathIgnorePatterns: ['/node_modules/'],
  testMatch: ['**/__tests__/**/*.js', '**/?(*.)+(spec|test).js'],
  collectCoverageFrom: [
    'controllers/**/*.js',
    'middleware/**/*.js',
    'routes/**/*.js',
    'utils/**/*.js',
    '!**/node_modules/**'
  ],
  setupFilesAfterEnv: ['<rootDir>/test/setup.js'],
  testTimeout: 10000,
  verbose: true,
  // Cargar variables de entorno antes de los tests
  globals: {
    'ts-jest': {
      isolatedModules: true
    }
  }
};

// Cargar .env.test antes de que Jest ejecute cualquier test
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_secret_key_minimo_32_caracteres_para_testing';
process.env.JWT_REFRESH_SECRET = 'test_refresh_secret_key_minimo_32_caracteres_testing';
process.env.MONGO_URI = 'mongodb://localhost:27017/test';
