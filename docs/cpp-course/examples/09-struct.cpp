#include <iostream>
#include <string>
#include <vector>

struct Student {
    std::string name;
    int score;
};

void print_student(const Student& s) {
    std::cout << s.name << " " << s.score << "\n";
}

int main() {
    std::vector<Student> class_list;
    class_list.push_back(Student{"Ada", 95});
    class_list.push_back(Student{"Grace", 88});
    class_list.push_back(Student{"Linus", 76});

    std::cout << "名单：\n";
    for (const Student& s : class_list) {
        print_student(s);
    }

    Student best = class_list[0];
    int sum = 0;
    for (const Student& s : class_list) {
        sum += s.score;
        if (s.score > best.score) {
            best = s;
        }
    }

    const double mean = static_cast<double>(sum) / static_cast<double>(class_list.size());
    std::cout << "平均分：" << mean << "\n";
    std::cout << "最高分：" << best.name << " " << best.score << "\n";
    return 0;
}
