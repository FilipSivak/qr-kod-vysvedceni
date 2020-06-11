# Aplikace pro čtení QR kódů z vysvědčení
Podle [doporučení MŠMT](https://www.msmt.cz/vzdelavani/skolstvi-v-cr/doporuceni-msmt-k-uvadeni-qr-kodu-na-vysvedcenich-a-dalsich) se nyní na vysvědčení uvádí QR kódy, které obsahují informace o známkách. To umožňuje strojové spracování vysvědčení. Přečtěte si více o [formátu QR kódu na vysvědčení](./doc/Prilohy_Doporuceni_k_uvadeni_QR_na_Vysvedceni.pdf).

Aplikace je v současné době ve vývoji. Kód vychází ze šablony https://github.com/FilipSivak/electron-python-starter.

## Informace pro vývojáře
1. Vytvořte [miniconda](https://docs.conda.io/en/latest/miniconda.html) environment:
    ```
    conda create --name qr-kod-vysvedceni python==3.7 unidecode
    ```
2. Aktivujte conda environment:
    ```
    conda activate qr-kod-vysvedceni
    ```
3. Nainstalujte závoslosti přes pip
    ```
    pip install pyinstaller pandas pyzbar opencv-python tqdm jupyter xlwt xlrd openpyxl setuptools==44.0.0
    ```
4. Nainstalujte nodejs závislosti `npm install`
5. Development verzi aplikace spusťte přes `npm start`
6. Po úpravě python scriptu spusťte pyinstaller build `npm run pyinstaller`
7. Po dokončení všech úprav spusťte následující příkaz pro sestavení instalátoru apliakce:
    ```
    npm run clean && npm run pyinstaller && npm run package && npm run installer
    ```

## Todo
- nabídnout možnost zahrnout známky z 8. třídy
- kromě obrázků zpracovávat také pdf
- upravit menu
    - čeština
    - odebrat "Help" sekci
