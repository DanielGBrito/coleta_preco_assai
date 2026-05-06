function extractCatalogs(menuJson) {
  const menu = menuJson && menuJson.data && Array.isArray(menuJson.data.menu)
    ? menuJson.data.menu
    : [];

  return menu
    .map((catalog) => ({
      code: catalog.code,
      name: catalog.name || '',
    }))
    .filter((catalog) => Boolean(catalog.code));
}

function pickPromotionalPrice(item) {
  const scalePrices = Array.isArray(item && item.scalePrices) ? item.scalePrices : [];
  const firstPrice = scalePrices.find((row) => row && row.price !== undefined && row.price !== null);
  return firstPrice ? firstPrice.price : '';
}

function mapCatalogItemsToRows(catalogJson, catalogName, config) {
  const categoryMenu = catalogJson && catalogJson.data ? catalogJson.data.categoryMenu : null;
  const itens = categoryMenu && Array.isArray(categoryMenu.itens) ? categoryMenu.itens : [];
  const nomeCategoria = categoryMenu && categoryMenu.name ? categoryMenu.name : (catalogName || '');

  return itens.map((item) => {
    const precode = item && item.unitPrice !== undefined && item.unitPrice !== null ? item.unitPrice : '';
    const precoPorPromo = pickPromotionalPrice(item);
    const precopor = precoPorPromo === '' ? precode : precoPorPromo;

    return {
      EAN: item && item.ean ? item.ean : '',
      URL: config.urls.productLink((item && item.id) || ''),
      NOME: (item && item.description) || '',
      PRECODE: precode,
      PRECOPOR: precopor,
      URLFOTO: item && item.logoUrl ? `${config.urls.photoBaseUrl}${item.logoUrl}` : '',
      SKUID: (item && item.externalCode) || '',
      DEPARTAMENTO: nomeCategoria,
      CATEGORIA: nomeCategoria,
    };
  });
}

module.exports = {
  extractCatalogs,
  mapCatalogItemsToRows,
};
