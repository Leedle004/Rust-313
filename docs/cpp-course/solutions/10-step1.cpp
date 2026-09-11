#include <iostream>
#include <string>
#include <vector>

struct Student {
    std::string name;
    int score;
};

void print_menu() {
    std::cout << "===== 成绩册 =====\n";
    std::cout << "1. 添加学生\n";
    std::cout << "2. 列出全部\n";
    std::cout << "3. 平均分\n";
    std::cout << "4. 最高分\n";
    std::cout << "0. 退出\n";
    std::cout << "请选择：";
}

int main() {
    std::vector<Student> students;

    while (true) {
        print_menu();
        int choice = 0;
        if (!(std::cin >> choice)) {
            std::cout << "输入结束\n";
            break;
        }
        if (choice == 0) {
            std::cout << "再见\n";
            break;
        }
        std::cout << "尚未实现。当前人数：" << students.size() << "\n";
    }
    return 0;
}
