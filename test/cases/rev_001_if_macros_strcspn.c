#include <stdio.h>
#include <string.h>
#define N2 15
#define LIM (10 + 5)
#define SUMA 10 + 5
#if LIM > 10 && N2 == 15
#define R 1
#else
#define R 0
#endif
#if 7 / 2 == 3
#define A 1
#else
#define A 0
#endif
#if SUMA * 2 == 20
#define B 1
#else
#define B 0
#endif
#if defined(LIM) && (LIM == 15 ? 1 : 0) && !defined(NOEXISTE) && -7 / 2 == -3 && (1 << 4) == 16
#define C 1
#else
#define C 0
#endif
int main() {
    char s[30];
    printf("%d %d %d %d\n", R, A, B, C);
    fgets(s, 30, stdin);
    s[strcspn(s, "\n")] = 0;
    printf("[%s] %d %d\n", s, (int) strcspn("hola mundo", "m"), (int) strspn("aabbc", "ab"));
    return 0;
}
