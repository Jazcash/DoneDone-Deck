let express = require('express');
let appConfig = require('./config/config');
let app = express();
let http = require("http").Server(app);
let fs = require("fs");
let config = JSON.parse(fs.readFileSync("config.json"));
let Donedone = require("./donedone").Donedone;
let dd = new Donedone(
	config.donedone.subdomain,
	config.donedone.username,
	config.donedone.apikey
);
require('./config/express')(app, appConfig);
let clientsConnected = false;
let issues = [];
try {
	stats = fs.lstatSync("issues.json");
	if (stats.isFile()) {
		issues = JSON.parse(fs.readFileSync("issues.json"));
	}
    console.log("Found issues.json file");
} catch (e) {
	console.log("issues.json not found or failed to parse");
}

if (issues == [])
	issues = dd.getAllActiveIssuesSync();

let statuses = [...new Set(issues.map(issue => issue.status.name))];
let fixers = [...new Set(issues.map(issue => issue.fixer.name))];
let testers = [...new Set(issues.map(issue => issue.tester.name))];
let projects = [...new Set(issues.map(issue => issue.project.name))];

let io = require('socket.io').listen(app.listen(appConfig.port, function () {
	console.log('Express server listening on port ' + appConfig.port);
}));

io.on('connection', function(socket) {
	console.log(`Client connected: ${socket.id}`);
	clientsConnected = true;
	socket.emit("init", config.donedone.subdomain, issues, statuses, fixers, testers, projects);

	socket.on("disconnect", function(){
        console.log(`Client disconnected: ${socket.id}`);
        if (io.sockets.sockets.length === 0)
        	clientsConnected = false;
    });
});

function fetchIssues(){
	if (clientsConnected){
		console.log("fetching issues...");
		dd.getAllActiveIssues().then(function(_issues) {
			statuses = [...new Set(_issues.map(issue => issue.status.name))];
			fixers = [...new Set(_issues.map(issue => issue.fixer.name))];
			testers = [...new Set(_issues.map(issue => issue.tester.name))];
			projects = [...new Set(_issues.map(issue => issue.project.name))];

			issues = _issues;
		}, function(err) {
			console.log(err);
		});
	}
	setTimeout(fetchIssues, 15000);
}

//fetchIssues();

process.on('SIGINT', function() {
    console.log("Stopping server...");
    fs.writeFileSync("issues.json", JSON.stringify(issues));
    console.log("Saved issues");
    process.exit(1);
});

process.on('uncaughtException', function(err) {
    console.log('Caught exception: ' + err);
    fs.writeFileSync("issues.json", JSON.stringify(issues));
    console.log("Saved issues");
    process.exit(1);
});

// console.log(issues.length);
// fs.writeFile("test.json", JSON.stringify(issues), function(err) {
// 	if(err) {
// 		return console.log(err);
// 	}
// 	console.log("The file was saved!");
// });

// dd.getAllActiveIssues().then(function(issues) {
// 	console.log(issues.length);
// 	fs.writeFile("test.json", JSON.stringify(issues), function(err) {
// 	    if(err) {
// 	        return console.log(err);
// 	    }
// 	    console.log("The file was saved!");
// 	});
// }, function(err) {
// 	console.log(err);
// });

// dd.getCompanies(function(companies){
// 	dd.getCompany(companies[4].id, function(company){
// 		console.log(company);
// 	});
// });
