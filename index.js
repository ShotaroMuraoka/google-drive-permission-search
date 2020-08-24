const fs = require('fs');
const readline = require('readline');
const { google } = require('googleapis');
const { drive } = require('googleapis/build/src/apis/drive');
const { file } = require('googleapis/build/src/apis/file');

// If modifying these scopes, delete token.json.
const SCOPES = ['https://www.googleapis.com/auth/drive.metadata.readonly'];
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_PATH = 'token.json';

// Load client secrets from a local file.
fs.readFile('credentials.json', (err, content) => {
  if (err) return console.log('Error loading client secret file:', err);
  // Authorize a client with credentials, then call the Google Drive API.
  authorize(JSON.parse(content), listFiles);
});

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize(credentials, callback) {
  const { client_secret, client_id, redirect_uris } = credentials.installed;
  const oAuth2Client = new google.auth.OAuth2(
    client_id, client_secret, redirect_uris[0]);

  // Check if we have previously stored a token.
  fs.readFile(TOKEN_PATH, (err, token) => {
    if (err) return getAccessToken(oAuth2Client, callback);
    oAuth2Client.setCredentials(JSON.parse(token));
    callback(oAuth2Client);
  });
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 * @param {google.auth.OAuth2} oAuth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback for the authorized client.
 */
function getAccessToken(oAuth2Client, callback) {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });
  console.log('Authorize this app by visiting this url:', authUrl);
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  rl.question('Enter the code from that page here: ', (code) => {
    rl.close();
    oAuth2Client.getToken(code, (err, token) => {
      if (err) return console.error('Error retrieving access token', err);
      oAuth2Client.setCredentials(token);
      // Store the token to disk for later program executions
      fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
        if (err) return console.error(err);
        console.log('Token stored to', TOKEN_PATH);
      });
      callback(oAuth2Client);
    });
  });
}

/**
 * Lists the names and IDs of up to 10 files.
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 */
async function listFiles(auth) {

  let permissionSerchResult = {
    unknown: [],
    anyone: [],
  };

  const drive = google.drive({ version: 'v3', auth });
  let fileList = [];
  var reqParam = { fields: 'nextPageToken, files(id, name)', }
  fileList = await fetchFileList(drive, reqParam, fileList);
  var permissionAlert = await fetchFilePermissionList(drive, events);
  // if (events.length) {
  //   events.map((file) => {
  //     console.log(file.name);
  //   });
  // }
  // let initialRequest = function(request, result) {
  //   request.execute(function(resp) {
  //     let nextPageToken = resp.nextPageToken;
  //     if(nextPageToken) {
  //       let nextParams = reqParams;
  //       nextParams.pageToken = nextPageToken;
  //       request = 
  //     }
  //   });
  // }  

  // ファイルリストを取得する.
  // var fetchDriveList = new Promise(function (resolve, reject) {
  //   drive.files.list({
  //     // TODO: To be resolve the per-user limitation.
  //     pageSize: 10,
  //     fields: 'nextPageToken, files(id, name)',
  //   }, (err, res) => {
  //     if (err) return console.log('File API returned an error: ' + err);
  //     const files = res.data.files;
  //     if (files.length) {
  //       console.log('Files:');
  //       files.map((file) => {
  //         // ファイルのパーミッションを取得する.
  //         const promise = (message, msec) => new Promise((resolve, reject) => {
  //           drive.permissions.list({
  //             fileId: file.id,
  //           }, (err, res) => {
  //             // if (err) return console.log('Permissions API returned an error: ' + err);
  //             if (err) {
  //               // console.log('Permissions API returned an error: ' + err);
  //               permissionSerchResult.unknown.push(file.name + file.id);
  //             } else {
  //               let permissions = res.data.permissions;
  //               permissions.map((permission) => {
  //                 if (permission.type === 'anyone') {
  //                   permissionSerchResult.anyone.push(file.name + file.id);
  //                   // console.log('Warning! Weve`ve detected dangerous files.');
  //                   // console.log(`${file.name} (${file.id})`);
  //                   // console.log('Permissions: ' + permission.type);
  //                 }
  //               });
  //             }
  //             resolve();
  //           }, msec);
  //         });

  //         // console.log(`${file.name} (${file.id})`);
  //       });
  //     } else {
  //       console.log('No files found.');
  //     }

  //     if (permissionSerchResult.unknown.length) {
  //       console.log('Warning!! The file permissions are unknown.');
  //       permissionSerchResult.unknown.map((files) => {
  //         console.log(files);
  //       });
  //     }
  //     if (permissionSerchResult.anyone.length) {
  //       console.log('Warning!! The file permissions are anyone.');
  //       permissionSerchResult.anyone.map((files) => {
  //         console.log(files);
  //       });
  //     }
  //     console.log('NextPageToken: ' + res.data.nextPageToken);
  //   });
  // }
}

async function fetchFileList(drive, reqParam, fileList) {
  return new Promise((resolve, reject) => {
    drive.files.list(reqParam, (err, res) => {
      if (err) {
        console.log('File ApI returned an error: ' + err);
        reject('File ApI returned an error: ' + err);
        return;
      }
      // fileList = fileList.concat(res.data.files);
      fileList = res.data.files;
      if (!fileList.length) {
        console.log('No files found.');
        reject('No files found.');
        return;
      }
      var nextPageToken = res.data.nextPageToken;
      if (res.data.nextPageToken) {
        console.log(nextPageToken);
        reqParam.nextPageToken = nextPageToken;
        fetchFileList(drive, reqParam, fileList);
      } else {
        resolve(fileList);
      }
      resolve(fileList);
    });
    return fileList;
  });
}

async function fetchFilePermissionList(drive, file) {
  return new Promise((resolve, reject) => {
    let permissionSearchResult = [];
    drive.permissions.list({ fileId: file.id },
      (err, res) => {
        if (err) {
          permissionSearchResult.unknown.push(file.name + file.id);
        } else {
          res.data.permissions.map((permission) => {
            if (permission.type === 'anyone') {
              permissionSearchResult.anyone.push(file.name + file.id);
            }
          })
        }
      });
    resolve(permissionSearchResult);
  });
}
