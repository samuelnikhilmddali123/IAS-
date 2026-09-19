const Order = require("../models/Order");

const generateBillNumber = async () => {
    const count = await Order.countDocuments({
        billNumber: { $ne: null }
    });

    const nextNumber = count + 1;

    return `BILL-${String(nextNumber).padStart(5, "0")}`;
};


const generateBill = async (orderId) => {

    // Find order
    const order = await Order.findById(orderId)
        .populate("user", "name email phone");

    if (!order) {
        const error = new Error("Order not found");
        error.statusCode = 404;
        throw error;
    }


    // Bill can only be generated for validated orders
    if (order.status !== "VALIDATED") {
        const error = new Error(
            "Order must be validated before generating bill"
        );
        error.statusCode = 400;
        throw error;
    }


    // Prevent generating another bill
    if (order.billNumber) {
        const error = new Error(
            "Bill has already been generated for this order"
        );
        error.statusCode = 400;
        throw error;
    }


    // Generate bill number
    const billNumber = await generateBillNumber();

    // Save bill information
    order.billNumber = billNumber;
    order.billGeneratedAt = new Date();

    await order.save();


    // Prepare bill response
    const bill = {
        billNumber,
        orderNumber: order.orderNumber,

        customer: {
            name: order.user.name,
            email: order.user.email,
            phone: order.user.phone
        },

        items: order.items.map((item) => ({
            name: item.name,
            quantity: item.quantity,
            price: item.price,
            total: item.total
        })),

        subtotal: order.subtotal,
        discount: order.discount,
        tax: order.tax,
        grandTotal: order.grandTotal,

        status: order.status,

        generatedAt: order.billGeneratedAt
    };


    return bill;
};


module.exports = {
    generateBill
};