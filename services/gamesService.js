const axios = require('axios');

const baseUrl = "https://nhl-score-api.herokuapp.com/api";
const baseUrl2 = "https://api-web.nhle.com";

const getResultsOLD = () => {
    return axios.get(`${baseUrl}/scores/latest`);
}

const getUpcomingGamesOLD = (endDate, startDate = endDate) => {
    return axios.get(`${baseUrl}/scores?startDate=${startDate}&endDate=${endDate}`);
}

// New version of getUpcomingGames using the new API endpoint (8.11.23)
const getUpcomingGames = () => {
    return axios.get(`${baseUrl2}/v1/schedule/now`);
}

const getResults = (date) => {
    return axios.get(`${baseUrl2}/v1/schedule/${date}`);
}

// eslint-disable-next-line import/no-anonymous-default-export
module.exports = {
    getResultsOLD,
    getUpcomingGamesOLD,
    getUpcomingGames,
    getResults
}