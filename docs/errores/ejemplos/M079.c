#include <stdio.h>
#include <string.h>
int main()
{
    char a[20] = "hola", b[20], c[40];
    strcpy(b, "mundo");
    strcpy(c, a);
    strcat(c, " ");
    strcat(c, b);
    printf("%s %d\n", c, (int)strlen(c));
    printf("%d %d %d\n", strcmp(a, b) < 0, strcmp(a, a), strcmp(b, a) > 0);
    return 0;
}
