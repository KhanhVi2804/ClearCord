using Microsoft.AspNetCore.Mvc;
using ClearCord.Data;
using ClearCord.Models;
using Microsoft.AspNetCore.Http;
using System.Linq;
using System;
using System.Collections.Generic;

namespace ClearCord.Controllers
{
    public class ServerController : Controller
    {
        private readonly DataContext _context;

        public ServerController(DataContext context)
        {
            _context = context;
        }

        // Trang chính: Hiển thị Servers và Channels của Server được chọn
        // Thêm tham số channelId để biết người dùng đang nhấn vào kênh nào
        public IActionResult Index(int? id, int? channelId)
        {
            // 1. Kiểm tra đăng nhập
            if (HttpContext.Session.GetInt32("UserId") == null)
            {
                return RedirectToAction("Login", "Account");
            }

            // 2. Lấy tất cả Server để hiện ở cột trái
            var servers = _context.Servers.ToList();

            // 3. Xử lý lấy Kênh (Channel) dựa trên ServerId (id)
            if (id != null)
            {
                // Tìm các kênh thuộc về Server này
                var channels = _context.Channels.Where(c => c.ServerId == id).ToList();

                // Lưu vào ViewBag để dùng bên View
                ViewBag.CurrentServerId = id;
                ViewBag.Channels = channels;

                // Lấy thông tin Server hiện tại
                var currentServer = servers.FirstOrDefault(s => s.Id == id);
                ViewBag.ServerName = currentServer?.Name;

                // 4. Xử lý logic chọn Kênh (Channel)
                if (channelId != null)
                {
                    // Nếu có channelId truyền vào, lấy thông tin kênh đó
                    var selectedChannel = channels.FirstOrDefault(c => c.Id == channelId);
                    ViewBag.CurrentChannelId = channelId;
                    ViewBag.ChannelName = selectedChannel?.Name;
                }
                else if (channels.Any())
                {
                    // Nếu chưa chọn kênh nào, mặc định chọn kênh đầu tiên trong danh sách
                    var firstChannel = channels.First();
                    ViewBag.CurrentChannelId = firstChannel.Id;
                    ViewBag.ChannelName = firstChannel.Name;
                }
            }
            else
            {
                // Nếu chưa chọn Server nào, gán danh sách rỗng để tránh lỗi foreach
                ViewBag.Channels = new List<Channel>();
            }

            return View(servers);
        }

        // 1. Hiển thị trang tạo Server (GET)
        [HttpGet]
        public IActionResult Create()
        {
            if (HttpContext.Session.GetInt32("UserId") == null)
            {
                return RedirectToAction("Login", "Account");
            }
            return View();
        }

        // 2. Xử lý lưu Server mới (POST)
        [HttpPost]
        public IActionResult Create(Server server)
        {
            // Kiểm tra tính hợp lệ của Model
            if (ModelState.IsValid)
            {
                server.CreatedAt = DateTime.Now;

                // Gán OwnerId là người đang đăng nhập từ Session
                server.OwnerId = HttpContext.Session.GetInt32("UserId") ?? 0;

                // Nếu cột Type trong DB yêu cầu giá trị (như lỗi bạn gặp trước đó)
                // Bạn có thể gán giá trị mặc định ở đây nếu cần

                _context.Servers.Add(server);
                _context.SaveChanges();

                // Tự động tạo một kênh "chung" cho server mới tạo
                // Lưu ý: Thêm thuộc tính Type nếu DB yêu cầu (ví dụ: Type = 1)
                var defaultChannel = new Channel { Name = "chung", ServerId = server.Id };
                _context.Channels.Add(defaultChannel);
                _context.SaveChanges();

                return RedirectToAction("Index", new { id = server.Id });
            }
            return View(server);
        }
    }
}