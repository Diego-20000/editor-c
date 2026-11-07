#include <stdio.h>
#include <string.h>
int main()
{
    char p[40];
    int i, n, ok = 1;
    scanf("%s", p);
    n = strlen(p);
    for (i = 0; i < n / 2; i++)
        if (p[i] != p[n - 1 - i]) ok = 0;
    printf("%s %s palindromo\n", p, ok ? "es" : "no es");
    return 0;
}
