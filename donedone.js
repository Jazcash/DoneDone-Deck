let request = require('request');
let syncrequest = require('sync-request');

function asyncRequest(url, callback){
	request(url, function (error, response, body) {
		if (!error && response.statusCode == 200) {
			callback(JSON.parse(body));
		} else {
			console.log(`Error with: ${url}`, error);
			callback({}, response.statusCode);
		}
	});
}

function syncRequest(url){
	let res = syncrequest("GET", url);
	try{
		let data = JSON.parse(res.getBody('utf8'));
		return data;
	} catch(err){
		return res.statusCode;
	}
}

function promiseRequest(url) {
	return new Promise(function(resolve, reject) {
		request(url, function(err, response, body) {
			if (err || response.statusCode !== 200) {
				reject({err: err, response: response});
			} else {
				resolve({response: response, body: body});
			}
		});
	});
}

class DoneDone{
	constructor(params){
		this.subdomain = params.subdomain;
		this.username = params.username;
		this.password = params.password;
		this.url = `https://${this.username}:${this.password}@${this.subdomain}.myDoneDone.com/issuetracker/api/v2`;
		this.usertype = "UNSET";

		// using sync function here because not sure how to return promise from class
		var data = this.getCompaniesSync();
		if (typeof data === "number"){
			switch(data){
				case 401:
					this.usertype = "INVALID";
					break;
				case 403:
					this.usertype = "NORMAL";
					break;
				default:
					this.usertype = "UNKNOWN";
			}
		} else{
			this.usertype = "ADMIN";
		}
	}

	getCompanies(callback){
		asyncRequest(`${this.url}/companies.json`, callback);
	}
	getCompaniesSync(){
		return syncRequest(`${this.url}/companies.json`);
	}

	getCompany(companyId, callback){
		asyncRequest(`${this.url}/companies/${companyId}.json`, callback)
	}
	getCompanySync(companyId){
		return syncRequest(`${this.url}/companies/${companyId}.json`)
	}

	getProjects(callback){
		asyncRequest(`${this.url}/projects.json`, callback);
	}
	getProjectsSync(){
		return syncRequest(`${this.url}/projects.json`);
	}

	getProject(projectId, callback){
		asyncRequest(`${this.url}/project/${projectId}.json`, callback);
	}
	getProjectSync(projectId){
		return syncRequest(`${this.url}/project/${projectId}.json`);
	}

	getIssue(projectId, issueId, callback){
		asyncRequest(`${this.url}/projects/${projectId}/issues/${issueId}.json`, callback);
	}
	getIssueSync(projectId, issueId){
		return syncRequest(`${this.url}/projects/${projectId}/issues/${issueId}.json`);
	}

	getAvailableStatuses(projectId = 1, issueId = 1, callback) {
		asyncRequest(`${this.url}/projects/${projectId}/issues/${issueId}/statuses/available_to_change_to.json`, callback);
	}
	getAvailableStatusesSync(projectId = 1, issueId = 1) {
		return syncRequest(`${this.url}/projects/${projectId}/issues/${issueId}/statuses/available_to_change_to.json`);
	}

	getAvailableReassignees(projectId, issueId, callback){
		asyncRequest(`${this.url}/projects/${projectId}/issues/${issueId}/people/available_for_reassignment.json`, callback);
	}
	getAvailableReassigneesSync(projectId, issueId){
		return syncRequest(`${this.url}/projects/${projectId}/issues/${issueId}/people/available_for_reassignment.json`);
	}

	updateIssue(projectId, issueId, params, callback){
		request({
			method: "PUT",
			uri: `${this.url}/projects/${projectId}/issues/${issueId}.json`,
			json: params
		}, callback);
	}
	updateIssueStatus(projectId, issueId, statusId, callback){
		request({
			method: "PUT",
			uri:  `${this.url}/projects/${projectId}/issues/${issueId}/status.json`,
			json: {new_status_id: statusId}
		}, callback)
	}

	updateIssueFixer(projectId, issueId, fixerId, callback){
		request({
			method: "PUT",
			uri:  `${this.url}/projects/${projectId}/issues/${issueId}/fixer.json`,
			json: {new_fixer_id: fixerId}
		}, callback)
	}

	updateIssueTester(projectId, issueId, testerId, callback){
		request({
			method: "PUT",
			uri:  `${this.url}/projects/${projectId}/issues/${issueId}/tester.json`,
			json: {new_tester_id: testerId}
		}, callback)
	}

	updateIssuePriorityLevel(projectId, issueId, priorityLevelId, callback){
		request({
			method: "PUT",
			uri:  `${this.url}/projects/${projectId}/issues/${issueId}/priority_level.json`,
			json: {new_priority_level_id: priorityLevelId}
		}, callback)
	}

	getActiveIssues() {
		let url = this.url;
		return promiseRequest(url + "/issues/all_active.json?take=500").then(function(results) {
			let data = JSON.parse(results.body);
			let promises = [];
			for (let i = 0; i < data.total_issues; i+= 500) {
				promises.push(promiseRequest(url + `/issues/all_active.json?skip=${i}&take=500`).then(function(results) {
					console.log("polling DoneDone api");
					return JSON.parse(results.body).issues;
				}));
			}
			return Promise.all(promises).then(function(results) {
				return Array.prototype.concat.apply([], results);
			})
		});
	}
	getActiveIssuesSync() {
		let url = this.url;
		let issues = [];
		console.log("polling DoneDone api");
		let res = syncrequest("GET", url + "/issues/all_active.json?take=500");
		let data = JSON.parse(res.getBody('utf8'));
		issues = issues.concat(data.issues);
		if (data.total_issues > 500){
			for (let i=500; i<data.total_issues; i+=500){
				console.log("polling DoneDone api");
				res = syncrequest("GET", url + `/issues/all_active.json?take=500&skip=${i}`);
				let data = JSON.parse(res.getBody('utf8'));
				issues = issues.concat(data.issues);
			}
		}
		return issues;
	}
}

module.exports = DoneDone;
