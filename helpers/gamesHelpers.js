const parseUpcomingGamesData = (data) => {
    let parsedData = [];
    data.forEach((game) => {
        parsedData = parsedData.concat(
            {
                status: game.status.state,
                startTime: game.startTime,
                homeAbbr: game.teams.home.abbreviation,
                awayAbbr: game.teams.away.abbreviation,
                homeCity: game.teams.home.locationName,
                awayCity: game.teams.away.locationName,
            }
        )
    })
    // console.log(parsedData);
    return parsedData;
}

const parseOngoingGamesData = (data) => {
    let parsedData = [];
    data.forEach((game) => {
        parsedData = parsedData.concat(
            {
                status: game.status.state,
                startTime: game.startTime,
                homeAbbr: game.teams.home.abbreviation,
                awayAbbr: game.teams.away.abbreviation,
                homeGoals: game.scores[game.teams.home.abbreviation],
                awayGoals: game.scores[game.teams.away.abbreviation],
                currentPeriod: game.status.progress.currentPeriodOrdinal,
                currentPeriodTimeLeft: game.status.progress.currentPeriodTimeRemaining.pretty
            }
        )
    })
    // console.log(parsedData);
    return parsedData;
}

const parseResultsData = (data) => {
    let parsedData = [];
    data.forEach((game) => {
        const homeAbbr = game.teams.home.abbreviation;
        const awayAbbr = game.teams.away.abbreviation;
        const gameId = `${awayAbbr}${homeAbbr}${
            game.startTime.split("T")[0]
        }`;
        parsedData = parsedData.concat(
            {
                status: game.status.state,
                startTime: game.startTime,
                homeAbbr: homeAbbr,
                awayAbbr: awayAbbr,
                homeCity: game.teams.home.locationName,
                awayCity: game.teams.away.locationName,
                homeGoals: game.scores[homeAbbr],
                awayGoals: game.scores[awayAbbr],
                gameId: gameId,
                winner: game.scores[homeAbbr] > game.scores[awayAbbr] ? homeAbbr : awayAbbr,
            }
        )
    })
    // console.log(parsedData);
    return parsedData;
}

// eslint-disable-next-line import/no-anonymous-default-export
module.exports = {
    parseUpcomingGamesData,
    parseOngoingGamesData,
    parseResultsData,
}