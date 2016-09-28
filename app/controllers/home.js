let express = require("express");
let fs = require("fs");
let DoneDone = require("../../donedone");
let router = express.Router();
var config = JSON.parse(fs.readFileSync("config.json"));
let ddAdmin = new DoneDone({
	subdomain: config.donedone.subdomain,
	username: config.donedone.username,
	password: config.donedone.apikey
});
let companyId = config.companiyId || ddAdmin.getCompaniesSync()[0].id;

let auth = function(req, res, next) {
	if (req.session && req.session.username){
		next();
	} else{
		res.redirect("/login");
	}
};

module.exports = function (app) {
	app.use("/", router);
};

router.get("/", auth, function (req, res, next) {
	res.render("index", {
		title: "DoneDoneDeck"
	});
});

router.post("/issues", auth, function(req, res, next){
	let dd = new DoneDone({
		subdomain: config.donedone.subdomain,
		username: req.session.username,
		password: req.session.password
	});

	let issues = dd.getActiveIssuesSync();
	req.session.issues = issues;

	let statuses = dd.getAvailableStatusesSync();
	let people = dd.getCompanySync(companyId).people;
	let projects = dd.getProjectsSync();

	res.send({
		subdomain:config.donedone.subdomain,
		issues: issues,
		priorities: req.session.issuePriorities,
		statuses: statuses,
		people: people,
		projects: projects
	});
});

router.get("/login", function(req, res, next){
	res.render("login", {
		title: "DoneDoneDeck",
		subdomain: config.donedone.subdomain[0].toUpperCase() + config.donedone.subdomain.substr(1)
	});
});

router.post("/login", function(req, res, next){
	if (req.body.username && req.body.password){ // if valid auth POST
		let dd = new DoneDone({
			subdomain: config.donedone.subdomain,
			username: req.body.username,
			password: req.body.password
		});
		if (dd.usertype === "ADMIN" || dd.usertype === "NORMAL"){
			req.session.usertype = dd.usertype;
			req.session.username = req.body.username;
			req.session.password = req.body.password;
			res.send(dd.usertype);
		} else {
			res.send(dd.usertype);
		}
	} else {
		res.send("INVALID");
	}
});

router.get("/logout", function(req, res, next){
	req.session.destroy();
	res.redirect("/");
});
