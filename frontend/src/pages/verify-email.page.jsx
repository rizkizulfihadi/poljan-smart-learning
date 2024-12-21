import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import axios from 'axios';

const VerifyEmail = () => {
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        const query = new URLSearchParams(location.search);
        const token = query.get('token');

        if (token) {
            axios.get(`${import.meta.env.VITE_SERVER_DOMAIN}/verify-email?token=${token}`)
                .then(({ data }) => {
                    localStorage.setItem("user", JSON.stringify(data));
                    toast.success('Email berhasil diverifikasi');
                    setTimeout(() => navigate('/'), 2000); // Redirect after 2 seconds
                })
                .catch(({ response }) => {
                    toast.error(response.data.error);
                });
        }
    }, [location, navigate]);

    return (
        <div>
            Verifying email...
        </div>
    );
};

export default VerifyEmail;
