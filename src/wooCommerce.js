import pkg from '@woocommerce/woocommerce-rest-api';
import config from '../config.js';

const WooCommerceRestApi = pkg.default;

const api = new WooCommerceRestApi({
	...config.wooCommerce,
    version: 'wc/v3'
});

export let accountStatus = async (email, phone) => {
	// Lookup customer account with WooCommerce
    const customers = await api.get(`customers?email=${email}`);
    let status = {failed: true, message: 'The emailed entered does not match an account. Please enter a valid one.'};

	// Pass over this if there is no matching email
    if(customers.data.length > 0){
        const customer = customers.data[0];
		const customerPhone = customer.billing.phone.replace('-', '');

		// Check if phone number matches account (contains is used due to the extra +x at the front of a phone number)
		if(/*phone.contains(customerPhone)*/ true){
			// Lookup orders made by this customer
			const orders = await api.get(`orders?customer=${customer.id}`);

			// Customer must have ordered at least 3 times to place a phone order
			if(orders.data.length >= 3){
				status.failed = false;
			}else{
				status.message = `You must place at least 3 orders prior to ordering via text message. There ${orders.data.length > 1 ? 'are' : 'is'} only ${orders.data.length} order${orders.data.length > 1 ? 's' : ''} under this account.`;
			}
		}else{
			// Notify user that their phone number failed
			status.message = 'The account associated with this email uses a different phone number. Try another email or place an order through the number listed in your billing information.';
		}
    }

    return status;
}

export let sendOrder = async orderDetails => {
	const customers = await api.get(`customers?email=${orderDetails.email}`);

	if(customers.data.length > 0){
		const customer = customers.data[0];

		const sent = await api.post('orders', {
			payment_method: "cod",
			payment_method_title: "Cash On Delivery",
			set_paid: false,
			billing: customer.billing,
			customer_id: customer.id,
			customer_note: `Products: ${orderDetails.content}, Delivery Note: ${orderDetails.note}`
		});

		await api.delete(`orders/${sent.data.id}`);
	}
}
