using Microsoft.AspNetCore.Mvc;
using ClearCord.Data;
using ClearCord.Models;
using System.Linq;

namespace ClearCord.Controllers
{
    public class AccountController : Controller
    {
        private readonly DataContext _context;

        public AccountController(DataContext context)
        {
            _context = context;
        }

        // 1. Hiển thị trang Đăng ký
        [HttpGet]
        public IActionResult Register()
        {
            return View();
        }
        // 1. Hiển thị trang Đăng nhập
        [HttpGet]
        public IActionResult Login()
        {
            return View();
        }

        [HttpPost]
        public IActionResult Login(LoginViewModel model)
        {
            var user = _context.Users.FirstOrDefault(u => u.Email == model.Email && u.PasswordHash == model.Password);

            if (user != null)
            {
                // LƯU ID VÀO SESSION
                HttpContext.Session.SetInt32("UserId", user.Id);
                HttpContext.Session.SetString("Username", user.Username);

                return RedirectToAction("Index", "Server"); // Đăng nhập xong vào thẳng danh sách Máy chủ
            }

            ModelState.AddModelError("", "Tài khoản hoặc mật khẩu không chính xác.");
            return View(model);
        }

        // 2. Xử lý khi nhấn nút Đăng ký
        [HttpPost]
        public IActionResult Register(User user)
        {
            if (ModelState.IsValid)
            {
                // Thêm người dùng vào database
                _context.Users.Add(user);
                _context.SaveChanges();

                // Đăng ký xong thì chuyển sang trang chủ (hoặc trang đăng nhập)
                return RedirectToAction("Index", "Home");
            }
            return View(user);
        }
    }
}