import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Store } from '../api'; // استيراد الواجهة من api.ts

const BACKEND = 'https://store-dashboard-backend.onrender.com';

interface Product {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image_url?: string;
  description?: string;
  category?: string;
}

interface CartItem extends Product {
  cartQuantity: number;
}

// لا حاجة لتعريف Store هنا، استخدم المستورد
