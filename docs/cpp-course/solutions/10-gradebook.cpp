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

void add_student(std::vector<Student>& students) {
    Student s;
    std::cout << "姓名（不含空格）和分数：";
    if (!(std::cin >> s.name >> s.score)) {
        std::cout << "输入无效\n";
        return;
    }
    if (s.score < 0 || s.score > 100) {
        std::cout << "分数必须在 0 到 100 之间\n";
        return;
    }
    students.push_back(s);
    std::cout << "已添加 " << s.name << "\n";
}

void list_students(const std::vector<Student>& students) {
    if (students.empty()) {
        std::cout << "（空）\n";
        return;
    }
    for (const Student& s : students) {
        std::cout << s.name << " " << s.score << "\n";
    }
}

void print_average(const std::vector<Student>& students) {
    if (students.empty()) {
        std::cout << "名单为空，无法计算平均分\n";
        return;
    }
    int sum = 0;
    for (const Student& s : students) {
        sum += s.score;
    }
    const double mean =
        static_cast<double>(sum) / static_cast<double>(students.size());
    std::cout << "平均分：" << mean << "\n";
}

void print_top(const std::vector<Student>& students) {
    if (students.empty()) {
        std::cout << "名单为空，没有最高分\n";
        return;
    }
    Student best = students[0];
    for (const Student& s : students) {
        if (s.score > best.score) {
            best = s;
        }
    }
    std::cout << "最高分：" << best.name << " " << best.score << "\n";
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
        switch (choice) {
            case 1:
                add_student(students);
                break;
            case 2:
                list_students(students);
                break;
            case 3:
                print_average(students);
                break;
            case 4:
                print_top(students);
                break;
            case 0:
                std::cout << "再见\n";
                return 0;
            default:
                std::cout << "无效选项\n";
                break;
        }
    }
    return 0;
}
