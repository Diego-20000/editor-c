#include <stdio.h>
int main()
{
    int a = 42, b = -7;
    printf("[%i][%5.3i][%+5d][%-+5d][% 05d][%+05d][%-05d]\n", a, a, a, a, a, a, a);
    printf("[%i][%5.3i][%+5d][%-+5d][% 05d][%+05d][%-05d]\n", b, b, b, b, b, b, b);
    printf("[%#X][%#o][%#x][%#x][%08.3f][%-8.1e]\n", 255, 8, 0, 255, 3.14159, 31415.9);
    printf("[%hhd][%hd][%hu]\n", 300, 70000, -1);
    printf("[%lu][%zu][%jd]\n", 5ul, sizeof(int), (long long)5);
    printf("[%5c][%-5c][%05d][%5s][%05s]\n", 'a', 'b', -3, "ab", "cd");
    return 0;
}
