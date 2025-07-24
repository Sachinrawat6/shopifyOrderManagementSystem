import axios from 'axios'
import React, { useState } from 'react'

const EditPage = ({ order, onClose, refreshPendingOrders }) => {
    const [size, setSize] = useState("");
    const BASE_URL = "https://return-inventory-backend.onrender.com/api/v1/shopify";
    const handleUpdateSize = async (e) => {
        e.preventDefault();
        const confirm = window.confirm("Are you sure want to edit this order.")
        if (!confirm) {
            return
        }
        const payload = {
            id: order._id,
            size
        }
        try {
            const response = await axios.post(`${BASE_URL}/edit`, payload)

            alert("Size updated Successfully");
            setSize("");
            onClose()
            refreshPendingOrders();


        } catch (error) {
            console.log("Failed to update size ", error)
        }

    }
    return (
        <div className='mx-auto max-w-xl'>
            <form className='flex gap-2' onSubmit={handleUpdateSize}>
                <select
                    onChange={(e) => setSize(e.target.value)}
                    value={size}
                    className='border-gray-200 bg-gray-100 py-2 px-4 rounded-md outline-gray-300 cursor-pointer'
                >
                    <option value=" ">Select Size </option>
                    <option value="XXS">XXS </option>
                    <option value="XS ">XS </option>
                    <option value="S ">S </option>
                    <option value="M">M </option>
                    <option value="L">L </option>
                    <option value="XL ">XL </option>
                    <option value="2XL ">2XL </option>
                    <option value="3XL">3XL </option>
                    <option value="4XL">4XL</option>
                    <option value="5XL">5XL</option>
                </select>
                <input type="submit" value="Update" className='col-span-2 border-yellow-200 bg-yellow-100 py-2 px-4 rounded-md outline-yellow-300 hover:bg-yellow-200 duration-75 ease-in cursor-pointer' />
            </form>
        </div>
    )
}

export default EditPage