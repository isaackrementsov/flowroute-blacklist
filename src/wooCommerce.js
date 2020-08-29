import WooCommerceRestApi from '@woocommerce/woocommerce-rest-api';
import config from '../config.js';

const api = new WooCommerceRestApi({
	...config.wooCommerce,
	version: 'wc/v3'
});
