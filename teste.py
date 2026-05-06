import os
import requests
from requests.exceptions import RequestException, SSLError
from urllib3.exceptions import InsecureRequestWarning

url = "https://cw-marketplace.ifood.com.br/v1/merchants/multicategory/57add8af-d999-4a29-924a-c70c25c72f45/catalog/7a292614-fb05-48ac-a104-77f24150c6ed?items_page=1&items_size=12"

headers = {
  'browser': 'Windows',
  'sec-ch-ua-platform': '"Windows"',
  'sec-ch-ua': '"Google Chrome";v="147", "Not.A/Brand";v="8", "Chromium";v="147"',
  'sec-ch-ua-mobile': '?0',
  'x-device-model': 'Windows Chrome',
  'Accept': 'application/json, text/plain, */*',
  'X-Ifood-Session-Id': '934c6058-b136-4391-afe7-e27c876e9bdd',
  'access_key': '69f181d5-0046-4221-b7b2-deef62bd60d5',
  'platform': 'Desktop',
  'x-client-application-key': '41a266ee-51b7-4c37-9e9d-5cd331f280d5',
  'X-Ifood-Device-Id': '1343ccf4-4aad-4f27-93bb-e3a4b8532d16',
  'Cache-Control': 'no-cache, no-store',
  'Referer': 'https://www.ifood.com.br/',
  'accept-language': 'pt-BR,pt;q=1',
  'secret_key': '9ef4fb4f-7a1d-4e0d-a9b1-9b82873297d8',
  'app_version': '9.141.2',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36',
  'x-px-cookies': '_px3=34909218f25d6c46f70033fe543c0d88565214cf4d721234c4852d32d9a84e1f:xJilD5tc7KqUPn1TBAtiRhpB/iwPLejyHI/EMLj/HJMl4FinpiUHmgi2T8YBo+CEvfycucBAXGLuzdnKo3iq/Q==:1000:ggv9arGAM1RLHN2+2FLLpZPlP28CqVTd+keuuSmNQLzVkKYTJooyKMJQ7EEjsBpjqwuy6SQdAzX7PSyrfhME4BK9+wFcEaLaR4Xrzr+MqE82F3XgwNFjYBDP8BLtO7rUN7083HdMOO5jywueTajCGUnTmHRNT2P/9JoIffe+yvkqUTTGR+B6wSUBrSHq2sspV+ZyFkk/1LsDRiObRtxbiROrV/CcA2EF9O6SV2K/CbUIiTcZqFIXMMMNkVLZz7SLjHlXgwVt+NWL2nde6qtfVNhAS7E/zSAjrvhegWjnwOGgGDCiSBhzXFGZCyqJk9sicUyqGXYYMVPi+rVzqrMtqAC77gsI8AkkQ9Y1TFMXGnsk30Jb4emw+He3BCyEH41kMo8bTwBvZlw+BjNhYw7VdnRL8jjKHmZU6ZSKaAAp5cYSTSAHnLWAaeW0T8U4c0jIyFz3gezD/QHZkcScdMIb+VF+YGOlBbXcVAwF3UaUooNZQfbpytUejwJlCpHgLApT; _pxvid=c2ed897a-38bf-11f1-960e-b4e9a7fa7b77; pxcts=c2ed917e-38bf-11f1-960e-b1b6a9aacaf0, true',
  'Cookie': 'bm_s=YAAQkAMVAqWDh9KdAQAAZVqY3gUJZpxNgaZLdHn9UG1KB7w7GY05UblEVYPFZD1bizA37yTMn1ytE2jtSgLqgC66BYTVSb4nU3WpZhdkVMvHVp+gTr5FYnoiRsSMzQdUIr+1S8GjviTAJMdMG5HmpprPFfqJxzMq2JnbqWBrJUgRpmHlc7fyQVe/b95LsSzijy4ca3f+E/Y16MQ1nkpO40gctt1AYEBt8A0gBQd2496f8qA8NBTYYCLK+arcdVJsCgMvPoCEd0QSnEp62oJ3BZEf7Nx1R85BVmMbDXKv6sGt9Jyh0wVV05t7YiAaanlyOOIhN09/Rb/UsWO7aPIeNN+cxzWUFe9mA3Yw01ATcyatwCJOBnyumAWYtjQBPT3dTeOSLkopUx+xYWeLb6x5RiShgTaBPGTjf41RgcBXyNTDlxJ5JnNLFAl54/gQOdODIN7MSsuZlutaOcnBUAIvz5FFeUlFQsJakVUvr3o/xALCsTJ2UGYjy99Hq07JDda34fWvmVt0tZYI/rsObrpoH68wAgU6SBazXsN4/oYUA4D5e80q8wMBzTB7uzpS22ukiZRElsLGwPfswXPHdC7iRG2XofmZomiKrgxXSfytWaZEPWeukIDi1+3oKJAqMlebjXeyqIPimniLNKt2mbaFFAwIyZB8/e6PfYFBb6zwsGO/lfAyqwJKOpExgNN8gqR25fH3w6KF719C9IuEZFZ4YBXHZQgZCN8mMxsGorCq+VSbhq+bXVJI194hWDZd7cONYkbROuLW27O/ro84XsolF5Fa3HILJ/el6JKpt825fMHL0RiGn+DJrHOTjrQNCQfPmaMyAI2X7FsdqZ1wFO8k8wQFg28jblIuP2HdRyHoGczOyVA=; _pxhd=354f00087dc2903c626bc24d7ea3d913a7bffbeb32c2537361a1f15b62a3bf81:c2ed897a-38bf-11f1-960e-b4e9a7fa7b77'
}


def get_verify_config():
  ca_bundle = os.getenv('REQUESTS_CA_BUNDLE') or os.getenv('SSL_CERT_FILE')
  if ca_bundle:
    return ca_bundle

  insecure_mode = os.getenv('IFOOD_INSECURE_SSL', '').lower() in ('1', 'true', 'yes')
  if insecure_mode:
    requests.packages.urllib3.disable_warnings(category=InsecureRequestWarning)
    return False

  return True


try:
  verify_config = get_verify_config()
  response = requests.get(url, headers=headers, timeout=60, verify=verify_config)
  response.raise_for_status()

  print(f"Status: {response.status_code}")
  print(response.text)

except SSLError as err:
  print("Erro SSL ao conectar na API.")
  print("Se sua rede usa proxy/certificado corporativo, exporte o certificado raiz e configure REQUESTS_CA_BUNDLE.")
  print(r"Exemplo PowerShell: $env:REQUESTS_CA_BUNDLE='C:\certs\empresa-root-ca.pem'")
  print(r"Apenas para teste (inseguro): $env:IFOOD_INSECURE_SSL='1'")
  raise SystemExit(err)

except RequestException as err:
  print(f"Erro HTTP/rede: {err}")
  raise SystemExit(err)
