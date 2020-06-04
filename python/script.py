from pathlib import Path
import sys
import io
import unidecode
import json
import os

if len(sys.argv) < 2:
    print("Not enough arguments!", file=sys.stderr)
    sys.exit(1)

# ARGS: space_key username token pages...
FILE_PATH = Path(sys.argv[1])
DEBUG_DIR = Path(os.environ["USERPROFILE"]).joinpath("AppData\\Local\\Electron\\ElectronPackage")

if not FILE_PATH.exists():
    print("File does not exist!", file=sys.stderr)
    sys.exit(1)

if not DEBUG_DIR.exists():
    os.makedirs(DEBUG_DIR)

print(unidecode.unidecode(json.dumps({"file": str(FILE_PATH)})))
