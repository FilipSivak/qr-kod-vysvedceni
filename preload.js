const { dialog } = require('electron').remote;
const ChildProcess = require('child_process').execFile;
const Shell = require('electron').shell
const fs = require('fs')

const OpenDialogButton = function (btn_id, files_callback, error_callback) {
  document.querySelector(btn_id).addEventListener('click', function (event) {
    const promise = dialog.showOpenDialog({
      properties: ['openFile', 'multiSelections']
    });

    promise.then((files) => {
      if (files !== undefined && !files.canceled) {
        // handle files
        files_callback(files.filePaths);
      } else {
        error_callback("No files selected!");
      }
    }).catch(error_callback);
  });
}

const PromiseExec = function (executable_path, args) {
  if (!fs.existsSync(executable_path)) {
    return Promise.reject(`Error: executable ${executable_path} does not exist! Did you run 'npm run pyinstaller'?`);
  }

  return new Promise((resolve, reject) => {
    console.log("call", `${executable_path} ${args.join(' ')}`)
    ChildProcess(executable_path, args, function (err, data, data_err) {
      if (err !== undefined && err !== null) {
        console.log(err, data, data_err);
        reject(err)
      } else {
        try {
          const result = JSON.parse(data.toString())
          resolve(result);
        } catch (err) {
          reject("Not valid JSON: " + data.toString());
        }
      }
    })
  })
}

const ShowProgressbar = function (percentage) {
  console.log("Progress:", percentage);
  if (percentage > 0) {
    document.querySelector("#btn").disabled = true;
    document.querySelector("#show_progress").style.display = "block";
    document.querySelector("#progress").style.width = `${percentage}%`;
  } else {
    document.querySelector("#show_progress").style.display = "none";
    document.querySelector("#progress").style.width = "0%";
    document.querySelector("#btn").disabled = false;
  }
}

const ShowSuccess = function (show) {
  if (show) {
    document.querySelector("#show_success").style.display = "block";
  } else {
    document.querySelector("#show_success").style.display = "none";
  }
}

const FixExternalLinks = function () {
  document.querySelectorAll("a.external").forEach(link => {
    link.addEventListener("click", function (event) {
      event.preventDefault()
      Shell.openExternal(link.href)
    })
  })
}

window.addEventListener('DOMContentLoaded', () => {
  const isDev = process.argv0.includes("node_modules")
  const exe_path = isDev ? "script.exe" : process.resourcesPath + "/app/script.exe";

  ShowSuccess(false);
  FixExternalLinks();

  OpenDialogButton("#btn", function (files) {
    ShowSuccess(false);

    return files.reduce((p, file, index) => {
      return p.then(() => {
        ShowProgressbar(Math.round(((index + 1) / files.length) * 100))
        return PromiseExec(exe_path, [file])
      }).catch(err =>
        Promise.reject(`Error processing file ${file}: ${err}\n`)
      )
    }, Promise.resolve()
    ).then((python_result) => {
      ShowProgressbar(0);
      console.log("Done!", python_result)
      ShowSuccess(true);
    }).catch(error => {
      console.error(error);
      alert(error);

      ShowProgressbar(0);
      ShowSuccess(false);
    })
  },
    function (err) {
      alert(err);
    }
  );

});