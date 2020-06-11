const { dialog } = require('electron').remote;
const ChildProcess = require('child_process').execFile;
const Shell = require('electron').shell
const fs = require('fs')

const {chunksToLinesAsync, chomp} = require('@rauschma/stringio');
const {spawn} = require('child_process');

const isPackaged = window.process.argv[window.process.argv.length - 1] === "--packaged";

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
        error_callback("Nebyly vybrány žádné soubory!");
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

const ShowProgressbar = function (percentage, message = "Prosím čekejte") {
  console.log("Progress:", percentage);
  if (percentage > 0) {
    document.querySelector("#btn").disabled = true;
    document.querySelector("#show_progress").style.display = "block";
    document.querySelector("#progress").style.width = `${percentage}%`;
    document.querySelector("#show-progress-message").innerText = message;
  } else {
    document.querySelector("#show_progress").style.display = "none";
    document.querySelector("#progress").style.width = "0%";
    document.querySelector("#btn").disabled = false;
  }
}

const ShowSuccess = function(show) {
  if (show) {
    document.querySelector("#show_success").style.display = "block";
  } else {
    document.querySelector("#show_success").style.display = "none";
  }
}

let showing_error = false;
const ShowError = function(show, error_message) {
  if (show) {
    showing_error = true;
    document.querySelector("#show_error").style.display = "block";
    document.querySelector("#error-message").innerText = error_message;
  } else {
    showing_error = false;
    document.querySelector("#show_error").style.display = "none";
    document.querySelector("#error-message").innerText = "neznámá chyba";
  }
}

const ShowWarning = function(show, warning_message) {
  if (show) {
    document.querySelector("#show_warning").style.display = "block";
    document.querySelector("#warning-message").innerText = warning_message;
  } else {
    document.querySelector("#show_warning").style.display = "none";
    document.querySelector("#warning-message").innerText = "";
  }
}

const FixExternalLinks = function () {
  document.querySelectorAll("a.external").forEach(link => {
    link.addEventListener("click", function (event) {
      event.preventDefault()
      Shell.openExternal(link.href)
    })
  })

  document.querySelectorAll("a.externalItem").forEach(link => {
    link.addEventListener("click", function (event) {
      event.preventDefault()
      Shell.openItem(link.href)
    })
  })
}

const UpdateFileTarget = function(target) {
  document.querySelector("#file-target").innerText = target;
}

window.addEventListener('DOMContentLoaded', () => {
  const isDev = process.argv0.includes("node_modules")
  let exe_path = isDev ? "script.exe" : process.resourcesPath + "/app/script.exe";
  let target_path = process.env.USERPROFILE + "\\Documents\\Znamky.xlsx";
  let prepend_args = []
  UpdateFileTarget(target_path);

  if(!isPackaged) {
    exe_path = "python";
    prepend_args = ["python/script.py"]
    ShowWarning(true, `Development mode: using command ${exe_path} ${prepend_args}`);
  }

  ShowSuccess(false);
  FixExternalLinks();

  document.querySelector("#btnSelectSaveLocation").addEventListener("click", () => {
    dialog.showSaveDialog({ defaultPath: target_path, filters: [{ name: "*.xlsx (Excel)", extensions: ['xlsx'] }] }).then((path) => {
      if(!path.canceled) {
        target_path = path.filePath;
        UpdateFileTarget(target_path);
      }
    })
  });

  /** Inspired by https://2ality.com/2018/05/child-process-streams.html */
  async function HandleTaskEvents(readable) {
    for await (const line of chunksToLinesAsync(readable)) {
      const data = chomp(line);
      console.log(data);
      const [type, message, task, taskCount] = JSON.parse(data);

      if(type == "message") {
        ShowProgressbar((0.001 + (parseInt(task) / parseInt(taskCount))) * 100, message);
      }

      if(type == "error") {
        ShowError(true, message);
        ShowProgressbar(0);
      }
    }
  }

  const DialogHandlerFunction = async function(files) {
    ShowSuccess(false);
    ShowError(false);

    console.log("Spawning the process");
    ShowProgressbar(0.001, "Připravuji (strpení prosím)");

    const args = prepend_args.concat([target_path]).concat(files)
    console.log(`Spawning process ${exe_path} with args ${args.join(", ")}`)
    const source = spawn(exe_path, args, {stdio: ['ignore', 'pipe', process.stderr]});
    await HandleTaskEvents(source.stdout);

    const file_link = document.querySelector("#link-saved-file")
    file_link.href = target_path;
    file_link.innerText = target_path;

    // TODO handle exit code

    source.on("exit", function(code, signal) {
      if (code == 0) {
        ShowProgressbar(0);
        ShowSuccess(true);
      } else {
        ShowProgressbar(0);

        if(!showing_error) {
          if(!isPackaged) {
            ShowError(true, "Chyba při běhu python skriptu. Zapnuli jste conda environment pomocí příkazu 'conda activate qr-kod-vysvedceni'?");
          } else {
            ShowError(true, "Neočekávaná chyba při běhu python skriptu");
          }
        }
      }
    })
    
  }

  OpenDialogButton("#btn", DialogHandlerFunction, () => alert("Error"));
});