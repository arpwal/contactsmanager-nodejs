module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  testMatch: ["**/src/**/*.integration.test.ts"],
  setupFiles: ["dotenv/config"],
  testTimeout: 30000, // Integration tests might take longer than unit tests
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        tsconfig: "tsconfig.json",
      },
    ],
  },
};
