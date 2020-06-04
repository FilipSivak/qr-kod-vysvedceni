from pathlib import Path
import sys
import io
import unidecode
import json
import os

from pyzbar import pyzbar
import cv2
from pathlib import Path
from tqdm import tqdm_notebook
import shutil
import re
import pandas as pd # don't forget to install optional dependencies 'xlwt' and 'xlrd' of pandas!

def find_qr_detection(detections):
    for det in detections:
        if det.type == "QRCODE":
            return det

def detect_grades(file_path):
    GRADE_PATTERN = r"(.+)\s{1}([1-5-N]{4})"
    
    # some filenames would not be accepted by opencv
    shutil.copy(file_path, "tmp.jpg")
    img = cv2.imread("tmp.jpg")
    
    # perform QR code detection
    detections = pyzbar.decode(img)
    det = find_qr_detection(detections)
    
    if det is None:
        # todo: change to logger
        print("Could not detect", file_name)
        return
      
    qr_data_tokens = det.data.decode("utf-8", "strict").split(";")

    for token in qr_data_tokens:
        for match in re.finditer(GRADE_PATTERN, token):
            # skip grades for 8th grade
            for grade in match.group(2)[-2:]:
                if grade != "-":
                    course = match.group(1)
                    yield {"soubor": Path(file_path).name, "jmeno": qr_data_tokens[1], "predmet": course, "znamka": int(grade)}

if len(sys.argv) < 2:
    print("Not enough arguments!", file=sys.stderr)
    sys.exit(1)

if __name__ == "__main__":
    FILE_PATH = Path(sys.argv[1])
    DEBUG_DIR = Path(os.environ["USERPROFILE"]).joinpath("AppData\\Local\\Electron\\QRKodVysvedceni")

    if not FILE_PATH.exists():
        print("File does not exist!", file=sys.stderr)
        sys.exit(1)

    if not DEBUG_DIR.exists():
        os.makedirs(DEBUG_DIR)

    # detect and store grades
    items = []
    for grades in detect_grades(FILE_PATH):
        items.append(grades)
    grades_df = pd.DataFrame(items)

    # read previous grades
    GRADES_FILE = Path("znamky.xlsx")

    if len(sys.argv) >= 3 and sys.argv[2] == "--first" and GRADES_FILE.exists():
        GRADES_FILE.unlink()

    if GRADES_FILE.exists():
        grades_so_far = pd.read_excel(GRADES_FILE, sheet_name = "Známky")
    else:
        grades_so_far = pd.DataFrame()

    # join both df's and store again
    df = grades_so_far.append(grades_df, ignore_index = True)

    # store two excel sheets
    writer = pd.ExcelWriter(GRADES_FILE)
    df.to_excel(writer, sheet_name = 'Známky', index = False)
    df.groupby(by = ["soubor", "jmeno"], as_index = False).mean().to_excel(writer, sheet_name = 'Průměry', index = False)
    writer.save()
    writer.close()

    print(unidecode.unidecode(json.dumps({"file": str(FILE_PATH)})))
