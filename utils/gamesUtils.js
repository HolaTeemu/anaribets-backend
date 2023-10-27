const parseUpcomingGamesData = (data) => {
  let parsedData = [];
  data.forEach((game) => {
    const gameId = `${game.teams.away.abbreviation}${
      game.teams.home.abbreviation
    }${game.startTime.split("T")[0]}`;
    if (game.status.state === "PREVIEW") {
      parsedData = parsedData.concat({
        status: game.status.state,
        startTime: game.startTime,
        homeAbbr: game.teams.home.abbreviation,
        awayAbbr: game.teams.away.abbreviation,
        homeCity: game.teams.home.locationName,
        awayCity: game.teams.away.locationName,
        gameId: gameId,
      });
    }
  });
  return parsedData;
};

const parseOngoingGamesData = (data) => {
  let parsedData = [];
  data.forEach((gameDate) => {
    gameDate.games.forEach((game) => {
      const homeAbbr = game.teams.home.abbreviation;
      const awayAbbr = game.teams.away.abbreviation;
      const gameId = `${awayAbbr}${homeAbbr}${game.startTime.split("T")[0]}`;
      if (game.status.state === "LIVE") {
        parsedData = parsedData.concat({
          status: game.status.state,
          startTime: game.startTime,
          homeAbbr: homeAbbr,
          awayAbbr: awayAbbr,
          homeGoals: game.scores[homeAbbr],
          awayGoals: game.scores[awayAbbr],
          homeCity: game.teams.home.locationName,
          awayCity: game.teams.away.locationName,
          currentPeriod: game.status.progress.currentPeriodOrdinal,
          currentPeriodTimeLeft:
            game.status.progress.currentPeriodTimeRemaining.pretty,
          gameId: gameId,
        });
      }
    });
  })
  return parsedData;
};

const parseResultsData = (data) => {
  let parsedData = [];
  data.forEach((game) => {
    const homeAbbr = game.teams.home.abbreviation;
    const awayAbbr = game.teams.away.abbreviation;
    const gameId = `${awayAbbr}${homeAbbr}${game.startTime.split("T")[0]}`;
    if (game.status.state === "FINAL") {
      parsedData = parsedData.concat({
        startTime: game.startTime,
        homeAbbr: homeAbbr,
        awayAbbr: awayAbbr,
        homeCity: game.teams.home.locationName,
        awayCity: game.teams.away.locationName,
        homeTeamName: game.teams.home.teamName,
        awayTeamName: game.teams.away.teamName,
        homeGoals: game.scores[homeAbbr],
        awayGoals: game.scores[awayAbbr],
        gameId: gameId,
        winner:
          game.scores[homeAbbr] > game.scores[awayAbbr] ? homeAbbr : awayAbbr,
        overtime: game.scores.overtime,
        shootout: game.scores.shootout,
      });
    }
  });
  return parsedData;
};

// eslint-disable-next-line import/no-anonymous-default-export
module.exports = {
  parseUpcomingGamesData,
  parseOngoingGamesData,
  parseResultsData,
};
