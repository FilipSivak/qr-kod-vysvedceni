from pathlib import Path
import sys
import io
import unidecode
import json
import os
from tempfile import NamedTemporaryFile

from pyzbar import pyzbar
import cv2
from pathlib import Path
from tqdm import tqdm_notebook
import shutil
import re
import pandas as pd # don't forget to install optional dependencies 'xlwt' and 'xlrd' of pandas!
import json
import logging
import tempfile

def find_qr_detection(detections):
    for det in detections:
        if det.type == "QRCODE":
            return det

def detect_grades(file_path):
    GRADE_PATTERN = r"(.+)\s{1}([1-5-N]{4})"
    
    if not file_path.exists():
        yield {"soubor": Path(file_path).name, "chyba": "Soubor nenalezen."}

    # some filenames would not be accepted by opencv
    tmp = tempfile.NamedTemporaryFile().name
    shutil.copy(file_path, tmp)
    img = cv2.imread(tmp)
    os.unlink(tmp)

    # perform QR code detection
    detections = pyzbar.decode(img)
    det = find_qr_detection(detections)
    
    if det is None:
        # todo: handle non-detected files
        yield {"soubor": Path(file_path).name, "chyba": "QR kod nenalezen."}
      
    qr_data_tokens = det.data.decode("utf-8", "strict").split(";")

    for token in qr_data_tokens:
        for match in re.finditer(GRADE_PATTERN, token):
            # skip grades for 8th grade
            for grade in match.group(2)[-2:]:
                if grade != "-":
                    course = match.group(1)
                    yield {"soubor": Path(file_path).name, "jmeno": qr_data_tokens[1], "predmet": course, "znamka": int(grade)}

def parent_process_message(message: str, task_index: int, task_number: int):
    # TODO assert or sanitize message to be single line
    print(json.dumps(["message", message.strip(), task_index, task_number]), flush=True)

def parent_process_error(message: str, task_index: int, task_number: int):
    # TODO assert or sanitize message to be single line
    print(json.dumps(["error", message.strip(), task_index, task_number]), flush=True)

if __name__ == "__main__":
    DEBUG_DIR = Path(os.environ["USERPROFILE"]).joinpath("AppData\\Local\\electron\\QRKodVysvedceni")
    if not DEBUG_DIR.exists():
        os.makedirs(DEBUG_DIR)

    logging.basicConfig(
        filename=str(DEBUG_DIR.joinpath("log.txt")), level=logging.DEBUG, 
        format='%(asctime)s %(levelname)s %(name)s %(message)s'
    )
    logger = logging.getLogger(__name__)
    
    parent_process_message("Inicializuji", 0, 10000)
    
    if len(sys.argv) < 3:
        parent_process_error(f"Chyba pri komunikaci s aplikaci! Nespravny pocet argumentu!", 1, 1)
        sys.exit(1)

    TARGET_PATH = Path(sys.argv[1])
    logger.debug(f"Target path: {TARGET_PATH}")

    try:
        with open(TARGET_PATH, "w") as file:
            pass
    except IOError as err:
        logger.error(err)
        parent_process_error(f"Do ciloveho souboru nelze zapisovat! Je otevren v Excelu?", 1, 1)
        sys.exit(1)

    # detect and store grades
    items = []
    errors = []
    for index, file_path in enumerate(sys.argv[2:]):
        try:
            file_path = Path(file_path)
            for grades in detect_grades(file_path):
                if "chyba" in grades:
                    errors.append(grades)
                else:
                    items.append(grades)
            parent_process_message(f"Zpracovavam soubory: {index}/{len(sys.argv[2:])}", index, len(sys.argv[2:]))
        except Exception as err:
            logger.error(err)
            errors.append({"soubor": Path(file_path).name, "chyba": f"{type(err).__name__}: {str(err)}"})
    
    parent_process_message(f"Ukladam do {TARGET_PATH}", 999, 1000)

    # store two excel sheets
    try:
        grades_df = pd.DataFrame(items)
        writer = pd.ExcelWriter(TARGET_PATH)
        grades_df.to_excel(writer, sheet_name = 'Známky', index = False)
        
        try:
            grades_df.groupby(by = ["soubor", "jmeno"], as_index = False).mean().to_excel(writer, sheet_name = 'Průměry', index = False)
        except Exception as err:
            logger.error(err)
        
        pd.DataFrame(errors).to_excel(writer, sheet_name = 'Chyby', index = False)
        writer.save()
        writer.close()
    except Exception as err:
        logger.error(err)
        parent_process_error(f"Chyba pri ukladani souboru: {type(err).__name__}: {str(err)}", 1, 1)
        sys.exit(1)
