# Aplikace pro čtení QR kódů z vysvědčení
Aplikace je v současné době ve vývoji.

## Informace pro vývojáře
1. Vytvořte miniconda environment:
    ```
    conda create --name qr-kod-vysvedceni python==3.7 unidecode
    ```
2. Aktivujte conda environment:
    ```
    conda activate qr-kod-vysvedceni
    ```
2. Nainstalujte závoslosti přes pip
    ```
    pip install pandas pyzbar opencv-python tqdm jupyter xlwt xlrd
    ```
