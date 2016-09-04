let express = require('express');
let appConfig = require('./config/config');
let app = express();
require('./config/express')(app, appConfig); // do away with express mvc and use socket properly https://github.com/oskosk/express-socket.io-session
let http = require("http").Server(app);
let fs = require("fs");
let config = JSON.parse(fs.readFileSync("config.json"));
let DoneDone = require("./donedone").DoneDone;
let ddAdmin = new DoneDone({
	subdomain: config.donedone.subdomain,
	username: config.donedone.username,
	password: config.donedone.apikey
});
let clientsConnected = false;
let issues = [];
let issuePriorities = {};
let companyId = config.companiyId || ddAdmin.getCompaniesSync()[0].id;
let sharedsession = require("express-socket.io-session");

let session = require("express-session")({
	secret: "my-secret",
	resave: true,
	saveUninitialized: true
});

app.use(session);


try {
	stats = fs.lstatSync("issues.json");
	if (stats.isFile()) {
		var dataFile = JSON.parse(fs.readFileSync("issues.json"));
		issues = dataFile.issues;
		issuePriorities = dataFile.issuePriorities;
	}
    console.log("Found issues.json file");
} catch (e) {
	console.log("issues.json not found or failed to parse");
}

if (issues.length === 0){
	issues = ddAdmin.getActiveIssuesSync();
}

let statuses = ddAdmin.getAvailableStatusesSync();
let people = ddAdmin.getCompanySync(companyId).people;
let projects = ddAdmin.getProjectsSync();

let io = require('socket.io').listen(app.listen(appConfig.port, function () {
	console.log('Express server listening on port ' + appConfig.port);
}));

io.use(sharedsession(session, {
	autoSave: true
}));

io.on('connection', function(socket) {
	let dd;

	console.log(`Client connected: ${socket.id}`);
	//socket.emit("init", config.donedone.subdomain, issues, issuePriorities, statuses, people, projects);

	// socket.on("priorityUpdate", function(_issuePriorities){
	// 	issuePriorities = _issuePriorities;
	// 	console.log("updated priorities");
	// 	saveIssuesToFile();
	// });

	socket.on("login", function(username, password){
		socket.handshake.session.test = "test";
		socket.handshake.session.save();

		console.log(username, password);

		// dd = new DoneDone(
		// 	config.donedone.subdomain,
		// 	config.donedone.username,
		// 	config.donedone.apikey
		// );
	});

	socket.on("updateIssueStatus", function(id, statusId, callback){
		// let [projectId, issueId] = id.split("-");

		// ddAdmin.getAvailableStatuses(projectId, issueId, function(data){
		// 	for (let i=0; i<data.length; i++){
		// 		if (data[i].id == statusId){
		// 			ddAdmin.updateIssueStatus(projectId, issueId, statusId, function(error, response, body){
		// 				callback(body);
		// 			});
		// 			return;
		// 		}
		// 	}

		// 	callback("NAH M8");
		// });
	});

	// socket.on("updateIssueFixer", function(id, fixerId, callback){
	// 	let [issueId, projectId] = id.split("-");
	// });

	socket.on("disconnect", function(){
        console.log(`Client disconnected: ${socket.id}`);
    });
});

//fetchIssues(dd);

function fetchIssues(dd){
	if (io.engine.clientsCount > 0){
		console.log("fetching issues...");
		dd.getActiveIssues().then(function(_issues) {
			issues = _issues;
			saveIssuesToFile();
		}, function(err) {
			console.log(err);
		});
	}
	setTimeout(fetchIssues, 15000);
}

function saveIssuesToFile(){
	fs.writeFileSync("issues.json", JSON.stringify({issues: issues, issuePriorities: issuePriorities}));
	console.log("Saved issues");
}

process.on('SIGINT', function() {
    console.log("Stopping server...");
    saveIssuesToFile();
    console.log("Saved issues");
    process.exit(1);
});

process.on('uncaughtException', function(err) {
    console.log('Caught exception: ' + err);
    saveIssuesToFile();
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

// ddAdmin.getAllActiveIssues().then(function(issues) {
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

// ddAdmin.getCompanies(function(companies){
// 	ddAdmin.getCompany(companies[4].id, function(company){
// 		console.log(company);
// 	});
// });
