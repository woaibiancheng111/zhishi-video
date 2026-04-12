#!/bin/bash
sed -i 's/--primary: #0ea5c6;/--primary: #00d2ff;/g' frontend/src/App.css
sed -i 's/--primary-dark: #0b7f99;/--primary-dark: #008fb3;/g' frontend/src/App.css
sed -i 's/--primary-light: #9fdaea;/--primary-light: #004d66;/g' frontend/src/App.css
sed -i 's/--primary-bg: #e7f7fb;/--primary-bg: #05141f;/g' frontend/src/App.css
sed -i 's/--dark: #0c1f33;/--dark: #e0f2fe;/g' frontend/src/App.css
sed -i 's/--text-primary: #1d2d40;/--text-primary: #c2d6e3;/g' frontend/src/App.css
sed -i 's/--text-secondary: #5d748d;/--text-secondary: #7492ab;/g' frontend/src/App.css
sed -i 's/--text-light: #91a5bb;/--text-light: #445b6e;/g' frontend/src/App.css
sed -i 's/--bg-primary: #eff4fa;/--bg-primary: #030812;/g' frontend/src/App.css
sed -i 's/--bg-white: #ffffff;/--bg-white: #081320;/g' frontend/src/App.css
sed -i 's/--border: #dde7f1;/--border: #132b43;/g' frontend/src/App.css
sed -i 's/--shadow-sm: 0 2px 10px rgba(17, 42, 70, 0.06);/--shadow-sm: 0 2px 10px rgba(0, 0, 0, 0.5);/g' frontend/src/App.css
sed -i 's/--shadow-md: 0 8px 24px rgba(17, 42, 70, 0.12);/--shadow-md: 0 0 15px rgba(0, 210, 255, 0.15);/g' frontend/src/App.css
sed -i 's/--gradient: linear-gradient(140deg, #11b7d8 0%, #0f80bb 60%, #0d5e94 100%);/--gradient: linear-gradient(140deg, #092c41 0%, #031422 100%);/g' frontend/src/App.css
sed -i 's/rgba(239, 244, 250, 0.86)/rgba(3, 8, 18, 0.86)/g' frontend/src/App.css
sed -i 's/rgba(221, 231, 241, 0.85)/rgba(19, 43, 67, 0.85)/g' frontend/src/App.css
