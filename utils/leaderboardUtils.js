const parseLeaderboardData = (data) => {
  let parsedData = [];
  data.forEach((player) => {
    parsedData = parsedData.concat({
      username: player.username,
      points: player.points,
      totalBets: player.totalBets,
    });
  });

  return parsedData;
};

// eslint-disable-next-line import/no-anonymous-default-export
module.exports = {
  parseLeaderboardData,
};
