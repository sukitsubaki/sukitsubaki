// for future express routing options
// now in use: direct routing via versel.json

module.exports = (req, res) => {
  res.json({
    message: "Welcome to sukitsubaki API",
    endpoints: [
      "/language-stats"
      // other end points
    ]
  });
};
