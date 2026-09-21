const Order = require("../models/Order");
const mongoose = require("mongoose");
const dataStore = require("../storage/dataStore");

const RESTAURANT_NAME = process.env.RESTAURANT_NAME || "IAS OFFICERS CANTEEN";

const generateBillNumber = async () => {
    if (mongoose.connection.readyState === 1) {
        try {
            const count = await Order.countDocuments({
                billNumber: { $ne: null }
            });
            const nextNumber = count + 1;
            return `BILL-${String(nextNumber).padStart(5, "0")}`;
        } catch (e) {
            console.warn('[BILL] Count documents fallback:', e.message);
        }
    }
    const allOrders = dataStore.getOrders ? dataStore.getOrders() : [];
    const count = allOrders.filter(o => o.billNumber).length;
    return `BILL-${String(count + 1).padStart(5, "0")}`;
};

const generateBill = async (orderId) => {
    let order = null;

    if (mongoose.connection.readyState === 1) {
        try {
            const isObjectId = mongoose.Types.ObjectId.isValid(orderId);
            order = await Order.findOne({
                $or: [
                    ...(isObjectId ? [{ _id: orderId }] : []),
                    { orderNumber: orderId }
                ]
            }).populate("user", "name email phone");
        } catch (e) {
            console.warn('[BILL] Find order fallback:', e.message);
        }
    }

    if (!order) {
        order = dataStore.getOrderById ? dataStore.getOrderById(orderId) : null;
    }

    if (!order) {
        const error = new Error("Order not found");
        error.statusCode = 404;
        throw error;
    }

    // Reuse existing bill number or generate new one
    const billNumber = order.billNumber || (await generateBillNumber());
    const billGeneratedAt = order.billGeneratedAt || new Date();

    order.billNumber = billNumber;
    order.billGeneratedAt = billGeneratedAt;

    if (order.save) {
        try {
            await order.save();
        } catch (e) {
            console.warn('[BILL] Save order bill info warning:', e.message);
        }
    }

    const customerName = (order.user && order.user.name) || order.userName || "IAS Officer";
    const customerPhone = (order.user && order.user.phone) || order.userPhone || "";
    const customerEmail = (order.user && order.user.email) || "";

    const items = (order.items || []).map((item) => ({
        name: item.name || (item.item && item.item.name) || "Food item",
        quantity: item.quantity || 1,
        price: item.price || (item.item && item.item.price) || 0,
        total: item.total || ((item.quantity || 1) * (item.price || (item.item && item.item.price) || 0))
    }));

    const subtotal = Number(order.subtotal || order.totalAmount) || items.reduce((s, i) => s + i.total, 0);
    const grandTotal = Number(order.grandTotal || order.totalAmount || subtotal);

    const bill = {
        billNumber,
        orderNumber: order.orderNumber,
        customer: {
            name: customerName,
            email: customerEmail,
            phone: customerPhone
        },
        items,
        subtotal,
        otherCharges: 0,
        discount: Number(order.discount || 0),
        tax: Number(order.tax || 0),
        grandTotal,
        orderType: order.orderType || 'INSTANT',
        pickupTime: order.pickupTime || null,
        pickupDate: order.pickupDate || null,
        generatedAt: billGeneratedAt
    };

    return bill;
};

/**
 * Formats a clean, professional text receipt matching the exact Canteen Bill format specification.
 */
const formatBillReceipt = ({ bill, restaurantName = RESTAURANT_NAME }) => {
    const dateObj = bill.generatedAt ? new Date(bill.generatedAt) : new Date();
    const day = String(dateObj.getDate()).padStart(2, '0');
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const year = dateObj.getFullYear();
    const dateStr = `${day}/${month}/${year}`;

    const timeStr = dateObj.toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    });

    const equalDivider = "================================";
    const dashDivider  = "--------------------------------";

    // Format item lines to strictly match 32-character width:
    // ITEM (20 chars left-aligned), QTY (5 chars right-aligned), AMT (7 chars right-aligned)
    const itemLines = (bill.items || []).map((item) => {
        let name = String(item.name || (item.item && item.item.name) || 'Food Item').trim();
        if (name.length > 20) {
            name = name.slice(0, 18) + '..';
        }
        const namePadded = name.padEnd(20, ' ');
        const qtyPadded = String(item.quantity || 1).padStart(5, ' ');
        const amtVal = `₹${item.total || ((item.price || 0) * (item.quantity || 1))}`;
        const amtPadded = amtVal.padStart(7, ' ');
        return `${namePadded}${qtyPadded}${amtPadded}`;
    }).join('\n');

    const rawOrderNo = String(bill.orderNumber || '').trim();
    const displayOrderNo = rawOrderNo.startsWith('#') ? rawOrderNo : `#${rawOrderNo}`;
    const customerName = bill.customer?.name || 'IAS Officer';
    const customerMobile = bill.customer?.phone || bill.customer?.mobile || '';
    const paymentStatus = bill.paymentStatus || (bill.isPaid ? 'PAID' : 'UNPAID');

    const totalStr = `₹${bill.grandTotal || bill.totalAmount || 0}`;
    const totalPadded = `TOTAL`.padEnd(25, ' ') + totalStr.padStart(7, ' ');

    let text = `${equalDivider}\n`;
    text += `        CANTEEN BILL\n`;
    text += `${equalDivider}\n\n`;
    text += `Order No: ${displayOrderNo}\n\n`;
    text += `Customer: ${customerName}\n`;
    text += `Mobile: ${customerMobile}\n\n`;
    text += `Date: ${dateStr}\n`;
    text += `Time: ${timeStr}\n\n`;
    text += `${dashDivider}\n`;
    text += `ITEM                 QTY    AMT\n`;
    text += `${dashDivider}\n`;
    text += `${itemLines}\n`;
    text += `${dashDivider}\n\n`;
    text += `${totalPadded}\n`;
    text += `${dashDivider}\n\n`;

    if (bill.pickupTime) {
        text += `Pickup Time: ${bill.pickupTime}\n\n`;
    }

    text += `Payment Status: ${paymentStatus}\n\n`;
    text += `Thank you for your order.\n`;
    text += `${equalDivider}`;

    return text;
};

module.exports = {
    generateBillNumber,
    generateBill,
    formatBillReceipt
};