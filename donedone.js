var request = require('request');
var syncrequest = require('sync-request');

var Donedone = function(subdomain, username, apikey){
	this.url = `https://${username}:${apikey}@${subdomain}.mydonedone.com/issuetracker/api/v2`;
}

function asyncRequest(url, callback){
	request(url, function (error, response, body) {
		if (!error && response.statusCode == 200) {
			callback(JSON.parse(body));
		} else {
			console.log(`Error with: ${url}`, error);
		}
	});
}

function syncRequest(url){
	var res = syncrequest("GET", url);
	var data = JSON.parse(res.getBody('utf8'));
	return data;
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

Donedone.prototype.getCompanies = function(callback){
	asyncRequest(`${this.url}/companies.json`, callback);
};

Donedone.prototype.getCompaniesSync = function(){
	return syncRequest(`${this.url}/companies.json`);
};

Donedone.prototype.getCompany = function(companyId, callback){
	asyncRequest(`${this.url}/companies/${companyId}.json`, callback)
};

Donedone.prototype.getCompanySync = function(companyId){
	return syncRequest(`${this.url}/companies/${companyId}.json`)
};

Donedone.prototype.getProjects = function(callback){
	asyncRequest(`${this.url}/projects.json`, callback);
};

Donedone.prototype.getProjectsSync = function(){
	return syncRequest(`${this.url}/projects.json`);
};

Donedone.prototype.getProject = function(projectId, callback){
	asyncRequest(`${this.url}/project/${projectId}.json`, callback);
};

Donedone.prototype.getProjectSync = function(projectId){
	return syncRequest(`${this.url}/project/${projectId}.json`);
};

Donedone.prototype.getIssue = function(projectId, issueId, callback){
	asyncRequest(`${this.url}/projects/${projectId}/issues/${issueId}.json`, callback);
};

Donedone.prototype.getIssueSync = function(projectId, issueId){
	return syncRequest(`${this.url}/projects/${projectId}/issues/${issueId}.json`);
};

Donedone.prototype.getAvailableStatuses = function(projectId = 1, issueId = 1, callback) {
	asyncRequest(`${this.url}/projects/${projectId}/issues/${issueId}/statuses/available_to_change_to.json`, callback);
};

Donedone.prototype.getAvailableStatusesSync = function(projectId = 1, issueId = 1) {
	return syncRequest(`${this.url}/projects/${projectId}/issues/${issueId}/statuses/available_to_change_to.json`);
};

Donedone.prototype.getAvailableReassignees = function(projectId, issueId, callback){
	asyncRequest(`${this.url}/projects/${projectId}/issues/${issueId}/people/available_for_reassignment.json`, callback);
}

Donedone.prototype.getAvailableReassigneesSync = function(projectId, issueId){
	return syncRequest(`${this.url}/projects/${projectId}/issues/${issueId}/people/available_for_reassignment.json`);
}

Donedone.prototype.updateIssue = function(projectId, issueId, params, callback){
	request({
		method: "PUT",
		uri: `${this.url}/projects/${projectId}/issues/${issueId}.json`,
		json: params
	}, callback);
};

Donedone.prototype.updateIssueStatus = function(projectId, issueId, statusId, callback){
	request({
		method: "PUT",
		uri:  `${this.url}/projects/${projectId}/issues/${issueId}/status.json`,
		json: {new_status_id: statusId}
	}, callback)
};

Donedone.prototype.updateIssueFixer = function(projectId, issueId, fixerId, callback){
	request({
		method: "PUT",
		uri:  `${this.url}/projects/${projectId}/issues/${issueId}/fixer.json`,
		json: {new_fixer_id: fixerId}
	}, callback)
};

Donedone.prototype.updateIssueTester = function(projectId, issueId, testerId, callback){
	request({
		method: "PUT",
		uri:  `${this.url}/projects/${projectId}/issues/${issueId}/tester.json`,
		json: {new_tester_id: testerId}
	}, callback)
};

Donedone.prototype.updateIssuePriorityLevel = function(projectId, issueId, priorityLevelId, callback){
	request({
		method: "PUT",
		uri:  `${this.url}/projects/${projectId}/issues/${issueId}/priority_level.json`,
		json: {new_priority_level_id: priorityLevelId}
	}, callback)
};

Donedone.prototype.getActiveIssues = function() {
    let url = this.url;
    return promiseRequest(url + "/issues/all_active.json?take=500").then(function(results) {
        let data = JSON.parse(results.body);
        let promises = [];
        for (let i = 0; i < data.total_issues; i+= 500) {
            promises.push(promiseRequest(url + `/issues/all_active.json?skip=${i}&take=500`).then(function(results) {
            	console.log("polling donedone api");
                return JSON.parse(results.body).issues;
            }));
        }
        return Promise.all(promises).then(function(results) {
            return Array.prototype.concat.apply([], results);
        })
    });
};

Donedone.prototype.getActiveIssuesSync = function() {
    let url = this.url;
    let issues = [];
    console.log("polling donedone api");
    let res = syncrequest("GET", url + "/issues/all_active.json?take=500");
    let data = JSON.parse(res.getBody('utf8'));
    issues = issues.concat(data.issues);
    if (data.total_issues > 500){
    	for (let i=500; i<data.total_issues; i+=500){
    		console.log("polling donedone api");
    		res = syncrequest("GET", url + `/issues/all_active.json?take=500&skip=${i}`);
    		let data = JSON.parse(res.getBody('utf8'));
    		issues = issues.concat(data.issues);
    	}
    }
    return issues;
};

exports.Donedone = Donedone;
